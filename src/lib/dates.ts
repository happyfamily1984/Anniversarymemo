import type { Anniversary } from './types';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export type YMD = { y: number; m: number; d: number };

export function parseYMD(s: string): YMD {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}

export function toYMDString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function ymdToDate({ y, m, d }: YMD): Date {
  return new Date(y, m - 1, d);
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** 2월 29일 기념일은 윤년이 아닌 해에는 2월 28일로 취급 */
export function occurrenceInYear(m: number, d: number, year: number): YMD {
  if (m === 2 && d === 29 && !isLeapYear(year)) return { y: year, m: 2, d: 28 };
  return { y: year, m, d };
}

function compareYMD(a: YMD, b: YMD): number {
  return a.y - b.y || a.m - b.m || a.d - b.d;
}

/** a에서 b까지 남은 일수 (b가 미래면 양수). DST 영향을 받지 않도록 UTC로 계산 */
export function daysBetween(a: YMD, b: YMD): number {
  const ua = Date.UTC(a.y, a.m - 1, a.d);
  const ub = Date.UTC(b.y, b.m - 1, b.d);
  return Math.round((ub - ua) / 86400000);
}

export function todayYMD(): YMD {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

/**
 * 오늘(포함) 이후 가장 가까운 기념일 날짜.
 * 1회성 기념일이 이미 지났으면 null.
 */
export function nextOccurrence(a: Pick<Anniversary, 'date' | 'repeat'>, today: YMD = todayYMD()): YMD | null {
  const start = parseYMD(a.date);
  if (a.repeat === 'once') {
    return compareYMD(start, today) >= 0 ? start : null;
  }
  if (compareYMD(start, today) >= 0) return start;
  let occ = occurrenceInYear(start.m, start.d, today.y);
  if (compareYMD(occ, today) < 0) occ = occurrenceInYear(start.m, start.d, today.y + 1);
  return occ;
}

export type Upcoming = {
  anniversary: Anniversary;
  date: YMD | null;
  /** 남은 일수 (0 = 오늘). 지난 1회성 기념일은 음수 */
  daysLeft: number;
  /** 매년 반복 기념일의 경우 몇 주년인지 (첫 해 = 0) */
  years: number;
  /** 기념일 날짜부터 오늘까지 며칠째인지 (그날 = 1일째). 아직 오지 않은 날이면 null */
  dayCount: number | null;
};

/** 시작일부터 오늘까지 며칠째인지 (시작일 = 1일째) */
export function dayCountSince(start: YMD, today: YMD = todayYMD()): number | null {
  const diff = daysBetween(start, today);
  return diff >= 0 ? diff + 1 : null;
}

export function toUpcoming(a: Anniversary, today: YMD = todayYMD()): Upcoming {
  const next = nextOccurrence(a, today);
  const start = parseYMD(a.date);
  if (!next) {
    return { anniversary: a, date: start, daysLeft: daysBetween(today, start), years: 0, dayCount: dayCountSince(start, today) };
  }
  return {
    anniversary: a,
    date: next,
    daysLeft: daysBetween(today, next),
    years: a.repeat === 'yearly' ? next.y - start.y : 0,
    dayCount: dayCountSince(start, today),
  };
}

/** 다가오는 순서대로 정렬. 지난 1회성 기념일은 맨 뒤(최근에 지난 순) */
export function sortUpcoming(list: Upcoming[]): Upcoming[] {
  return [...list].sort((a, b) => {
    const aPast = a.daysLeft < 0;
    const bPast = b.daysLeft < 0;
    if (aPast !== bPast) return aPast ? 1 : -1;
    if (aPast) return b.daysLeft - a.daysLeft;
    return a.daysLeft - b.daysLeft;
  });
}

/** 12345 → "12,345" */
export function formatCount(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatDday(daysLeft: number): string {
  if (daysLeft === 0) return 'D-DAY';
  if (daysLeft > 0) return `D-${daysLeft}`;
  return `D+${-daysLeft}`;
}

export function formatDate(ymd: YMD, withYear = true): string {
  const wd = WEEKDAYS[ymdToDate(ymd).getDay()];
  const mm = String(ymd.m).padStart(2, '0');
  const dd = String(ymd.d).padStart(2, '0');
  return withYear ? `${ymd.y}.${mm}.${dd} (${wd})` : `${mm}.${dd} (${wd})`;
}

export function formatLongToday(ymd: YMD = todayYMD()): string {
  const wd = WEEKDAYS[ymdToDate(ymd).getDay()];
  return `${ymd.y}년 ${ymd.m}월 ${ymd.d}일 ${wd}요일`;
}
