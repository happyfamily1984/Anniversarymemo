import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { nextOccurrence, occurrenceInYear, parseYMD, todayYMD, type YMD, ymdToDate } from './dates';
import type { Anniversary, Family } from './types';

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
 * 공유된 기념일 목록을 기준으로 이 기기의 로컬 알림을 다시 예약한다.
 * 다른 가족 구성원이 추가/수정한 기념일도 동기화될 때 함께 반영된다.
 */
export async function syncNotifications(anniversaries: Anniversary[], families: Family[], force = false) {
  const familyName = new Map(families.map((f) => [f.id, f.name]));
  const signature = JSON.stringify({
    day: todayYMD(),
    items: anniversaries
      .map((a) => [a.id, a.title, a.date, a.repeat, a.memo, familyName.get(a.familyId) ?? ''])
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

  for (const a of anniversaries) {
    const fam = familyName.get(a.familyId);
    const content: Notifications.NotificationContentInput = {
      title: `🎉 오늘은 ${fam ? `${fam} · ` : ''}${a.title}`,
      body: a.memo?.trim() || (a.repeat === 'yearly' ? '매년 돌아오는 소중한 날이에요.' : '잊지 말고 챙겨주세요!'),
      data: { anniversaryId: a.id },
    };
    for (const trigger of triggersFor(a)) {
      await Notifications.scheduleNotificationAsync({ content, trigger });
    }
  }
  await AsyncStorage.setItem(SIGNATURE_KEY, signature);
}

export async function clearNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem(SIGNATURE_KEY);
}
