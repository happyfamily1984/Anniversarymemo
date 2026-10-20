import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseError } from 'firebase/app';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { withProfileDefaults } from '../components/Profile';
import { db, ensureSignedIn, isFirebaseConfigured } from './firebase';
import { leaveGroup as leaveGroupRemote, updateProfile as updateProfileRemote } from './group';
import { clearNotifications, ensureNotificationPermission, syncNotifications } from './notifications';
import type { Anniversary, Family, GroupData, GroupInfo, Member, Profile, Session } from './types';

const STORE_KEY = 'groups.v2';
const LEGACY_SESSION_KEY = 'session';

/** 이 기기에 저장되는 내용: 내 프로필 + 가입한 가족 그룹 목록 + 지금 보고 있는 그룹 */
type Stored = { profile: Profile; codes: string[]; active: string };

const EMPTY_GROUP: GroupData = { info: null, families: [], anniversaries: [], members: [], synced: false, parts: 0 };

type GroupState = {
  /** 저장된 정보를 불러오는 중 */
  loading: boolean;
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
  members: Member[];
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

async function loadStored(): Promise<Stored | null> {
  const raw = await AsyncStorage.getItem(STORE_KEY);
  if (raw) {
    const s = JSON.parse(raw) as Stored;
    return { ...s, profile: withProfileDefaults(s.profile) };
  }
  // 이전 버전(그룹 1개)에서 옮겨오기
  const legacy = await AsyncStorage.getItem(LEGACY_SESSION_KEY);
  if (!legacy) return null;
  const { code, ...profile } = JSON.parse(legacy) as Session;
  const migrated: Stored = { profile: withProfileDefaults(profile), codes: [code], active: code };
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(migrated));
  await AsyncStorage.removeItem(LEGACY_SESSION_KEY);
  return migrated;
}

export function GroupProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [stored, setStored] = useState<Stored | null>(null);
  const [groupData, setGroupData] = useState<Record<string, GroupData>>({});
  const [error, setError] = useState<string | null>(null);
  const storedRef = useRef(stored);
  storedRef.current = stored;

  useEffect(() => {
    loadStored()
      .then(setStored)
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (next: Stored | null) => {
    if (next && next.codes.length > 0) await AsyncStorage.setItem(STORE_KEY, JSON.stringify(next));
    else await AsyncStorage.removeItem(STORE_KEY);
    setStored(next && next.codes.length > 0 ? next : null);
  }, []);

  /** 이 기기에서 그룹을 목록에서 뺀다 (원격 탈퇴는 하지 않음) */
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
    let unsubs: (() => void)[] = [];
    let cancelled = false;

    const patch = (code: string, part: number, update: Partial<GroupData>) =>
      setGroupData((prev) => {
        const cur = prev[code] ?? EMPTY_GROUP;
        const parts = cur.parts | part;
        return { ...prev, [code]: { ...cur, ...update, synced: parts === 15, parts } };
      });

    ensureSignedIn()
      .then(() => {
        if (cancelled) return;
        setError(null);
        for (const code of codes) {
          const onError = (e: Error) => {
            if (e instanceof FirebaseError && e.code === 'permission-denied') {
              setError('가족 그룹에 접근할 수 없어 목록에서 뺐어요. 다시 참여해 주세요.');
              dropGroup(code);
            } else {
              setError(e.message);
            }
          };
          unsubs.push(
            onSnapshot(
              doc(db, 'groups', code),
              (snap) => patch(code, 1, { info: { code, name: (snap.data()?.name as string) ?? '우리 가족' } }),
              onError,
            ),
            onSnapshot(
              collection(db, 'groups', code, 'families'),
              (snap) => {
                const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Family);
                list.sort((a, b) => a.createdAt - b.createdAt);
                patch(code, 2, { families: list });
              },
              onError,
            ),
            onSnapshot(
              collection(db, 'groups', code, 'anniversaries'),
              (snap) =>
                patch(code, 4, { anniversaries: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Anniversary) }),
              onError,
            ),
            onSnapshot(
              collection(db, 'groups', code, 'members'),
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
                patch(code, 8, { members: list });
              },
              onError,
            ),
          );
        }
      })
      .catch((e: Error) => setError(e.message));

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, [codesKey, dropGroup]);

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
      await save({ profile, codes: codesNext, active: code });
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

  const value = useMemo<GroupState>(() => {
    const active = stored?.active ?? '';
    const data = groupData[active] ?? EMPTY_GROUP;
    return {
      loading,
      session: stored ? { ...stored.profile, code: active } : null,
      groups: codes.map((c) => groupData[c]?.info ?? { code: c, name: '불러오는 중…' }),
      groupData,
      group: data.info,
      families: data.families,
      anniversaries: data.anniversaries,
      members: data.members,
      synced: data.synced,
      error,
      switchGroup,
      enterGroup,
      leaveGroup,
      setProfile,
      resyncNotifications,
    };
  }, [loading, stored, codes, groupData, error, switchGroup, enterGroup, leaveGroup, setProfile, resyncNotifications]);

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
