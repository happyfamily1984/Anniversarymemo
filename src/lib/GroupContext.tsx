import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseError } from 'firebase/app';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { withProfileDefaults } from '../components/Profile';
import { auth, db, isFirebaseConfigured, signOut } from './firebase';
import { joinGroup, leaveGroup as leaveGroupRemote, updateProfile as updateProfileRemote } from './group';
import { clearNotifications, ensureNotificationPermission, syncNotifications } from './notifications';
import type { Anniversary, Family, GroupData, GroupInfo, Member, Person, Profile, Session } from './types';

// 예전 버전(익명 로그인)에서 기기에 저장하던 키. 구글 로그인 후 계정으로 옮긴다.
const LEGACY_KEYS = ['groups.v2', 'session'];

/** users/{uid} 문서: 내 프로필 + 가입한 가족 그룹 목록 + 지금 보고 있는 그룹 */
type Stored = { profile: Profile; codes: string[]; active: string };

const EMPTY_GROUP: GroupData = {
  info: null,
  families: [],
  anniversaries: [],
  people: [],
  members: [],
  synced: false,
  parts: 0,
};

type GroupState = {
  /** 로그인 상태/내 정보를 불러오는 중 */
  loading: boolean;
  /** 구글 계정으로 로그인했는지 */
  signedIn: boolean;
  /** 구글 계정 이름 (처음 프로필 이름 기본값) */
  accountName: string;
  accountEmail: string;
  logout: () => Promise<void>;
  /** 지금 보고 있는 그룹 + 내 프로필 (가입한 그룹이 없으면 null) */
  session: Session | null;
  /** 가입한 가족 그룹들 (탭 순서) */
  groups: GroupInfo[];
  /** 모든 그룹의 데이터 */
  groupData: Record<string, GroupData>;
  // ---- 지금 보고 있는 그룹 ----
  group: GroupInfo | null;
  families: Family[];
  anniversaries: Anniversary[];
  people: Person[];
  /** 가입한 사람 목록 (방장에게만 보임) */
  members: Member[];
  /** 지금 그룹을 내가 만들었는지 */
  isOwner: boolean;
  synced: boolean;
  error: string | null;
  switchGroup: (code: string) => void;
  /** 새 그룹에 들어가고 그 그룹을 보여준다 */
  enterGroup: (code: string, profile: Profile) => Promise<void>;
  /** 지금 보고 있는 그룹에서 나가기 */
  leaveGroup: () => Promise<void>;
  setProfile: (profile: Profile) => Promise<void>;
  resyncNotifications: () => Promise<boolean>;
};

const GroupContext = createContext<GroupState | null>(null);

/** 예전 버전에서 기기에 저장된 그룹 목록 (없으면 null) */
async function loadLegacy(): Promise<Stored | null> {
  const [v2, v1] = await Promise.all(LEGACY_KEYS.map((k) => AsyncStorage.getItem(k)));
  if (v2) {
    const s = JSON.parse(v2) as Stored;
    return { ...s, profile: withProfileDefaults(s.profile) };
  }
  if (v1) {
    const { code, ...profile } = JSON.parse(v1) as Session;
    return { profile: withProfileDefaults(profile), codes: [code], active: code };
  }
  return null;
}

/** 예전 기기 저장 정보를 계정으로 옮기고, 그 그룹들에 이 계정으로 다시 참여시킨다 */
async function migrateLegacy(uid: string, remote: Stored | null): Promise<void> {
  const legacy = await loadLegacy();
  if (!legacy) return;
  const missing = legacy.codes.filter((c) => !remote?.codes.includes(c));
  const profile = remote?.profile ?? legacy.profile;
  const joined: string[] = [];
  for (const code of missing) {
    try {
      await joinGroup(code, profile);
      joined.push(code);
    } catch {
      // 없어진 그룹 등은 건너뜀
    }
  }
  if (joined.length > 0 || !remote) {
    const codes = [...(remote?.codes ?? []), ...joined];
    await setDoc(doc(db, 'users', uid), {
      profile,
      codes,
      active: remote?.active && codes.includes(remote.active) ? remote.active : (codes[0] ?? ''),
    });
  }
  await AsyncStorage.multiRemove(LEGACY_KEYS);
}

export function GroupProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  /** undefined = 아직 불러오는 중, null = 아직 프로필/그룹 없음 */
  const [stored, setStored] = useState<Stored | null | undefined>(undefined);
  const [groupData, setGroupData] = useState<Record<string, GroupData>>({});
  const [error, setError] = useState<string | null>(null);
  /** 예전 기기 저장 정보를 계정으로 옮기는 중 */
  const [migrating, setMigrating] = useState(false);
  const storedRef = useRef(stored);
  storedRef.current = stored;

  const signedIn = !!user && !user.isAnonymous;
  const uid = signedIn ? user.uid : '';

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthReady(true);
      }),
    [],
  );

  // 내 계정 정보(users/{uid}) 실시간 구독 → 다른 기기에서 바꿔도 반영
  useEffect(() => {
    if (!uid) {
      setStored(undefined);
      setGroupData({});
      return;
    }
    let migrated = false;
    return onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        const data = snap.exists() ? (snap.data() as Stored) : null;
        const next = data && data.codes?.length ? { ...data, profile: withProfileDefaults(data.profile) } : null;
        setStored(next);
        if (!migrated) {
          migrated = true;
          setMigrating(true);
          migrateLegacy(uid, next)
            .catch(() => {})
            .finally(() => setMigrating(false));
        }
      },
      (e) => setError(e.message),
    );
  }, [uid]);

  const save = useCallback(
    async (next: Stored) => {
      if (!uid) return;
      setStored(next.codes.length > 0 ? next : null);
      await setDoc(doc(db, 'users', uid), next);
    },
    [uid],
  );

  /** 내 그룹 목록에서 뺀다 (원격 탈퇴는 하지 않음) */
  const dropGroup = useCallback(
    async (code: string) => {
      const cur = storedRef.current;
      if (!cur) return;
      const codes = cur.codes.filter((c) => c !== code);
      await save({ ...cur, codes, active: cur.active === code ? (codes[0] ?? '') : cur.active });
      setGroupData((prev) => {
        const { [code]: _removed, ...rest } = prev;
        return rest;
      });
      if (codes.length === 0) await clearNotifications();
    },
    [save],
  );

  // 가입한 모든 그룹 데이터 실시간 구독 (그룹 간 중복 알림을 합치려면 전부 필요)
  const codesKey = stored?.codes.join(',') ?? '';
  useEffect(() => {
    if (!codesKey || !isFirebaseConfigured) return;
    const codes = codesKey.split(',');
    const unsubs: (() => void)[] = [];

    const patch = (code: string, part: number, update: Partial<GroupData>) =>
      setGroupData((prev) => {
        const cur = prev[code] ?? EMPTY_GROUP;
        const parts = cur.parts | part;
        return { ...prev, [code]: { ...cur, ...update, synced: parts === 15, parts } };
      });

    setError(null);
    for (const code of codes) {
      // 그룹 문서 자체를 못 읽을 때만(탈퇴/삭제됨) 목록에서 뺀다
      const onGroupError = (e: Error) => {
        if (e instanceof FirebaseError && e.code === 'permission-denied') {
          setError('가족 그룹에 접근할 수 없어 목록에서 뺐어요. 다시 참여해 주세요.');
          dropGroup(code);
        } else {
          setError(e.message);
        }
      };
      // 하위 데이터는 보안 규칙이 아직 반영되지 않았을 수 있으므로 그룹을 빼지 않고 빈 목록으로 둔다
      const onError = (part: number) => (e: Error) => {
        if (e instanceof FirebaseError && e.code === 'permission-denied') patch(code, part, {});
        else setError(e.message);
      };
      unsubs.push(
        onSnapshot(
          doc(db, 'groups', code),
          (snap) =>
            patch(code, 1, {
              info: {
                code,
                name: (snap.data()?.name as string) ?? '우리 가족',
                ownerUid: snap.data()?.ownerUid as string | undefined,
              },
            }),
          onGroupError,
        ),
        onSnapshot(
          collection(db, 'groups', code, 'families'),
          (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Family);
            list.sort((a, b) => a.createdAt - b.createdAt);
            patch(code, 2, { families: list });
          },
          onError(2),
        ),
        onSnapshot(
          collection(db, 'groups', code, 'anniversaries'),
          (snap) =>
            patch(code, 4, { anniversaries: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Anniversary) }),
          onError(4),
        ),
        onSnapshot(
          collection(db, 'groups', code, 'people'),
          (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Person);
            list.sort((a, b) => a.createdAt - b.createdAt);
            patch(code, 8, { people: list });
          },
          onError(8),
        ),
      );
    }

    return () => unsubs.forEach((u) => u());
  }, [codesKey, dropGroup]);

  // 가입한 사람 목록은 방장만 볼 수 있다 (보안 규칙도 방장/본인만 읽기 허용)
  const activeCode = stored?.active ?? '';
  const activeOwner = groupData[activeCode]?.info?.ownerUid;
  const isOwner = !!uid && activeOwner === uid;
  useEffect(() => {
    if (!isOwner || !activeCode) return;
    return onSnapshot(
      collection(db, 'groups', activeCode, 'members'),
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data();
          return withProfileDefaults({
            uid: d.id,
            nickname: data.nickname as string,
            emoji: data.emoji as string,
            color: data.color as string,
          });
        });
        list.sort((a, b) => a.nickname.localeCompare(b.nickname, 'ko'));
        setGroupData((prev) => (prev[activeCode] ? { ...prev, [activeCode]: { ...prev[activeCode], members: list } } : prev));
      },
      () => {},
    );
  }, [isOwner, activeCode]);

  const codes = useMemo(() => (codesKey ? codesKey.split(',') : []), [codesKey]);
  const allSynced = codes.length > 0 && codes.every((c) => groupData[c]?.synced);

  // 데이터가 바뀌거나 앱이 다시 열릴 때(날짜가 바뀌었을 수 있음) 알림 재예약
  useEffect(() => {
    if (!allSynced) return;
    const list = codes.map((c) => groupData[c]);
    syncNotifications(list).catch(() => {});
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncNotifications(list).catch(() => {});
    });
    return () => sub.remove();
  }, [allSynced, codes, groupData]);

  const switchGroup = useCallback(
    (code: string) => {
      const cur = storedRef.current;
      if (cur && cur.codes.includes(code) && cur.active !== code) save({ ...cur, active: code });
    },
    [save],
  );

  const enterGroup = useCallback(
    async (code: string, profile: Profile) => {
      const cur = storedRef.current;
      const codesNext = cur ? (cur.codes.includes(code) ? cur.codes : [...cur.codes, code]) : [code];
      await save({ profile: cur?.profile ?? profile, codes: codesNext, active: code });
      await ensureNotificationPermission().catch(() => false);
    },
    [save],
  );

  const leaveGroup = useCallback(async () => {
    const cur = storedRef.current;
    if (!cur) return;
    await leaveGroupRemote(cur.active).catch(() => {});
    await dropGroup(cur.active);
  }, [dropGroup]);

  const setProfile = useCallback(
    async (profile: Profile) => {
      const cur = storedRef.current;
      if (!cur) return;
      // 프로필은 가입한 모든 그룹에 똑같이 적용
      await Promise.all(cur.codes.map((c) => updateProfileRemote(c, profile)));
      await save({ ...cur, profile });
    },
    [save],
  );

  const resyncNotifications = useCallback(async () => {
    const granted = await ensureNotificationPermission();
    await syncNotifications(
      codes.map((c) => groupData[c] ?? EMPTY_GROUP),
      true,
    );
    return granted;
  }, [codes, groupData]);

  const logout = useCallback(async () => {
    await clearNotifications();
    await signOut();
  }, []);

  const loading = !authReady || (signedIn && (stored === undefined || migrating));

  const value = useMemo<GroupState>(() => {
    const active = stored?.active ?? '';
    const data = groupData[active] ?? EMPTY_GROUP;
    return {
      loading,
      signedIn,
      accountName: user?.displayName ?? '',
      accountEmail: user?.email ?? '',
      logout,
      session: stored ? { ...stored.profile, code: active, uid } : null,
      groups: codes.map((c) => groupData[c]?.info ?? { code: c, name: '불러오는 중…' }),
      groupData,
      group: data.info,
      families: data.families,
      anniversaries: data.anniversaries,
      people: data.people,
      members: isOwner ? data.members : [],
      isOwner,
      synced: data.synced,
      error,
      switchGroup,
      enterGroup,
      leaveGroup,
      setProfile,
      resyncNotifications,
    };
  }, [loading, signedIn, user, uid, logout, stored, codes, groupData, isOwner, error, switchGroup, enterGroup, leaveGroup, setProfile, resyncNotifications]);

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}

export function useGroup(): GroupState {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error('useGroup must be used inside GroupProvider');
  return ctx;
}

/** 지금 보고 있는 그룹의 코드 (그룹에 들어와 있는 화면에서만 사용) */
export function useGroupCode(): string {
  const { session } = useGroup();
  if (!session) throw new Error('not in a group');
  return session.code;
}
