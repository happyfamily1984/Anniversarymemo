import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseError } from 'firebase/app';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { db, ensureSignedIn, isFirebaseConfigured } from './firebase';
import { withProfileDefaults } from '../components/Profile';
import { leaveGroup as leaveGroupRemote, updateProfile as updateProfileRemote } from './group';
import { clearNotifications, ensureNotificationPermission, syncNotifications } from './notifications';
import type { Anniversary, Family, GroupInfo, Member, Profile, Session } from './types';

const SESSION_KEY = 'session';

type GroupState = {
  /** 저장된 세션을 불러오는 중 */
  loading: boolean;
  session: Session | null;
  group: GroupInfo | null;
  families: Family[];
  anniversaries: Anniversary[];
  members: Member[];
  /** 첫 데이터 동기화 완료 여부 */
  synced: boolean;
  error: string | null;
  enterGroup: (session: Session) => Promise<void>;
  leaveGroup: () => Promise<void>;
  setProfile: (profile: Profile) => Promise<void>;
  resyncNotifications: () => Promise<boolean>;
};

const GroupContext = createContext<GroupState | null>(null);

export function GroupProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [syncedParts, setSyncedParts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (raw) setSession(withProfileDefaults(JSON.parse(raw) as Session));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const resetData = useCallback(() => {
    setGroup(null);
    setFamilies([]);
    setAnniversaries([]);
    setMembers([]);
    setSyncedParts(0);
  }, []);

  const clearSession = useCallback(async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    await clearNotifications();
    resetData();
    setSession(null);
  }, [resetData]);

  // 그룹 데이터 실시간 구독
  useEffect(() => {
    if (!session || !isFirebaseConfigured) return;
    const code = session.code;
    let unsubs: (() => void)[] = [];
    let cancelled = false;

    const onError = (e: Error) => {
      if (e instanceof FirebaseError && e.code === 'permission-denied') {
        setError('그룹에 접근할 수 없습니다. 다시 참여해 주세요.');
        clearSession();
      } else {
        setError(e.message);
      }
    };

    ensureSignedIn()
      .then(() => {
        if (cancelled) return;
        setError(null);
        unsubs = [
          onSnapshot(
            doc(db, 'groups', code),
            (snap) => {
              const data = snap.data();
              setGroup({ code, name: (data?.name as string) ?? '우리 가족' });
              setSyncedParts((n) => n | 1);
            },
            onError,
          ),
          onSnapshot(
            collection(db, 'groups', code, 'families'),
            (snap) => {
              const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Family);
              list.sort((a, b) => a.createdAt - b.createdAt);
              setFamilies(list);
              setSyncedParts((n) => n | 2);
            },
            onError,
          ),
          onSnapshot(
            collection(db, 'groups', code, 'anniversaries'),
            (snap) => {
              setAnniversaries(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Anniversary));
              setSyncedParts((n) => n | 4);
            },
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
              setMembers(list);
              setSyncedParts((n) => n | 8);
            },
            onError,
          ),
        ];
      })
      .catch(onError);

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, [session, clearSession]);

  const synced = syncedParts === 15;

  // 데이터가 바뀌거나 앱이 다시 열릴 때(날짜가 바뀌었을 수 있음) 알림 재예약
  useEffect(() => {
    if (!synced) return;
    syncNotifications(anniversaries, families).catch(() => {});
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncNotifications(anniversaries, families).catch(() => {});
    });
    return () => sub.remove();
  }, [synced, anniversaries, families]);

  const enterGroup = useCallback(
    async (next: Session) => {
      resetData();
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next));
      setSession(next);
      await ensureNotificationPermission().catch(() => false);
    },
    [resetData],
  );

  const leaveGroup = useCallback(async () => {
    if (session) await leaveGroupRemote(session.code).catch(() => {});
    await clearSession();
  }, [session, clearSession]);

  const setProfile = useCallback(
    async (profile: Profile) => {
      if (!session) return;
      await updateProfileRemote(session.code, profile);
      const next = { ...session, ...profile };
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next));
      setSession(next);
    },
    [session],
  );

  const resyncNotifications = useCallback(async () => {
    const granted = await ensureNotificationPermission();
    await syncNotifications(anniversaries, families, true);
    return granted;
  }, [anniversaries, families]);

  const value = useMemo<GroupState>(
    () => ({
      loading,
      session,
      group,
      families,
      anniversaries,
      members,
      synced,
      error,
      enterGroup,
      leaveGroup,
      setProfile,
      resyncNotifications,
    }),
    [loading, session, group, families, anniversaries, members, synced, error, enterGroup, leaveGroup, setProfile, resyncNotifications],
  );

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}

export function useGroup(): GroupState {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error('useGroup must be used inside GroupProvider');
  return ctx;
}

/** 그룹에 들어와 있는 상태에서만 쓰는 화면용 */
export function useGroupCode(): string {
  const { session } = useGroup();
  if (!session) throw new Error('not in a group');
  return session.code;
}
