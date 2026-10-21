import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { nextOccurrence, occurrenceInYear, parseYMD, todayYMD, type YMD, ymdToDate } from './dates';
import { type MergedAnniversary, mergeAcrossGroups } from './merge';
import type { Anniversary, GroupData } from './types';

/** 기념일 당일 알림 시각 */
export const NOTIFY_HOUR = 9;
const NOTIFY_MINUTE = 0;
const CHANNEL_ID = 'anniversary';
const SIGNATURE_KEY = 'notifications.signature';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: '기념일 알림',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

function atNotifyTime(ymd: YMD): Date {
  const date = ymdToDate(ymd);
  date.setHours(NOTIFY_HOUR, NOTIFY_MINUTE, 0, 0);
  return date;
}

function dateTrigger(ymd: YMD): Notifications.NotificationTriggerInput | null {
  const date = atNotifyTime(ymd);
  if (date.getTime() <= Date.now()) return null;
  return { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID };
}

/** 한 기념일에 대해 예약할 트리거 목록 */
function triggersFor(a: Anniversary): Notifications.NotificationTriggerInput[] {
  const today = todayYMD();
  const start = parseYMD(a.date);

  if (a.repeat === 'once') {
    const t = dateTrigger(start);
    return t ? [t] : [];
  }

  const first = nextOccurrence(a, today);
  // 시작일이 아직 오지 않았으면 그날만 예약 (이후 앱 실행 시 매년 알림으로 다시 예약됨)
  if (first && first.y === start.y && first.m === start.m && first.d === start.d && start.y > today.y) {
    const t = dateTrigger(start);
    return t ? [t] : [];
  }

  // 2월 29일은 매년 반복 트리거로 표현할 수 없으므로 앞으로 4년치를 각각 예약 (평년은 2월 28일)
  if (start.m === 2 && start.d === 29) {
    const list: Notifications.NotificationTriggerInput[] = [];
    for (let y = today.y; y <= today.y + 4; y++) {
      const t = dateTrigger(occurrenceInYear(2, 29, y));
      if (t) list.push(t);
    }
    return list;
  }

  return [
    {
      type: Notifications.SchedulableTriggerInputTypes.YEARLY,
      month: start.m - 1, // JS Date 기준 (1월 = 0)
      day: start.d,
      hour: NOTIFY_HOUR,
      minute: NOTIFY_MINUTE,
      channelId: CHANNEL_ID,
    },
  ];
}

/**
 * 가입한 모든 가족 그룹의 기념일을 기준으로 이 기기의 로컬 알림을 다시 예약한다.
 * 여러 그룹에 같은 기념일이 있으면 알림은 한 번만 울리고, 해당 그룹 이름을 함께 표시한다.
 */
let syncQueue: Promise<void> = Promise.resolve();

export function syncNotifications(groups: GroupData[], force = false): Promise<void> {
  // 동시에 여러 번 불리면 '전부 취소 → 다시 예약'이 겹쳐 같은 알림이 두 번 예약될 수 있으므로 한 번에 하나씩 실행
  const run = syncQueue.then(() => syncNow(groups, force));
  syncQueue = run.catch(() => {});
  return run;
}

async function syncNow(groups: GroupData[], force: boolean) {
  const merged = mergeAcrossGroups(
    groups
      .filter((g) => g.info)
      .map((g) => ({ code: g.info!.code, name: g.info!.name, families: g.families, anniversaries: g.anniversaries })),
  );
  const signature = JSON.stringify({
    day: todayYMD(),
    items: merged
      .map((m) => [m.key, m.anniversary.id, m.anniversary.date, m.anniversary.memo, m.groupNames, m.familyNames])
      .sort(),
  });
  if (!force) {
    const prev = await AsyncStorage.getItem(SIGNATURE_KEY);
    if (prev === signature) return;
  }

  const { granted } = await Notifications.getPermissionsAsync();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!granted) {
    await AsyncStorage.removeItem(SIGNATURE_KEY);
    return;
  }

  for (const m of merged) {
    for (const trigger of triggersFor(m.anniversary)) {
      await Notifications.scheduleNotificationAsync({ content: notificationContent(m), trigger });
    }
  }
  await AsyncStorage.setItem(SIGNATURE_KEY, signature);
}

function notificationContent(m: MergedAnniversary): Notifications.NotificationContentInput {
  const a = m.anniversary;
  const memo = a.memo?.trim();
  const fallback = a.repeat === 'yearly' ? '매년 돌아오는 소중한 날이에요.' : '잊지 말고 챙겨주세요!';
  const data = { anniversaryId: a.id, groupCode: m.groupCode };

  if (m.groupNames.length > 1) {
    // 여러 가족 그룹 공통 기념일: 한 번만 알리고 어느 그룹들의 기념일인지 표시
    const tag = `👨‍👩‍👧‍👦 ${m.groupNames.join(' · ')} 공통 기념일`;
    return { title: `🎉 오늘은 ${a.title}`, body: memo ? `${tag}\n${memo}` : tag, data };
  }
  const fam = m.familyNames[0];
  return { title: `🎉 오늘은 ${fam ? `${fam} · ` : ''}${a.title}`, body: memo || fallback, data };
}

export async function clearNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem(SIGNATURE_KEY);
}
