import assert from 'node:assert/strict';
import { test } from 'node:test';

import { daysBetween, formatCount, formatDday, nextOccurrence, sortUpcoming, toUpcoming, type YMD } from './dates.ts';
import type { Anniversary } from './types.ts';

const today: YMD = { y: 2026, m: 10, d: 20 };

function ann(date: string, repeat: Anniversary['repeat'], id = date): Anniversary {
  return { id, familyId: 'f', title: id, date, memo: '', repeat, createdByName: '', createdAt: 0, updatedAt: 0 };
}

test('매년 반복: 올해 날짜가 남았으면 올해', () => {
  assert.deepEqual(nextOccurrence(ann('1960-11-03', 'yearly'), today), { y: 2026, m: 11, d: 3 });
});

test('매년 반복: 올해 지났으면 내년', () => {
  assert.deepEqual(nextOccurrence(ann('1990-03-01', 'yearly'), today), { y: 2027, m: 3, d: 1 });
});

test('오늘이 기념일이면 D-DAY', () => {
  const u = toUpcoming(ann('2000-10-20', 'yearly'), today);
  assert.equal(u.daysLeft, 0);
  assert.equal(u.years, 26);
  assert.equal(formatDday(u.daysLeft), 'D-DAY');
});

test('2월 29일은 평년에 2월 28일', () => {
  assert.deepEqual(nextOccurrence(ann('2000-02-29', 'yearly'), today), { y: 2027, m: 2, d: 28 });
  assert.deepEqual(nextOccurrence(ann('2000-02-29', 'yearly'), { y: 2027, m: 3, d: 1 }), { y: 2028, m: 2, d: 29 });
});

test('1회성: 지나면 null', () => {
  assert.equal(nextOccurrence(ann('2026-10-01', 'once'), today), null);
  assert.deepEqual(nextOccurrence(ann('2026-12-25', 'once'), today), { y: 2026, m: 12, d: 25 });
});

test('미래에 시작하는 매년 기념일은 시작일이 첫 기념일', () => {
  const u = toUpcoming(ann('2028-05-01', 'yearly'), today);
  assert.deepEqual(u.date, { y: 2028, m: 5, d: 1 });
  assert.equal(u.years, 0);
});

test('daysBetween은 연말을 넘어가도 정확', () => {
  assert.equal(daysBetween({ y: 2026, m: 12, d: 31 }, { y: 2027, m: 1, d: 1 }), 1);
  assert.equal(daysBetween(today, { y: 2027, m: 10, d: 20 }), 365);
});

test('정렬: 가까운 순, 지난 1회성은 맨 뒤', () => {
  const list = sortUpcoming(
    [ann('2026-01-01', 'once', 'past'), ann('1999-12-25', 'yearly', 'xmas'), ann('1999-10-22', 'yearly', 'soon')].map((a) =>
      toUpcoming(a, today),
    ),
  );
  assert.deepEqual(
    list.map((u) => u.anniversary.id),
    ['soon', 'xmas', 'past'],
  );
});

test('며칠째: 기념일 당일이 1일째, 미래 날짜는 null', () => {
  assert.equal(toUpcoming(ann('2026-10-20', 'once'), today).dayCount, 1);
  assert.equal(toUpcoming(ann('2025-10-20', 'yearly'), today).dayCount, 366);
  assert.equal(toUpcoming(ann('2026-12-25', 'once'), today).dayCount, null);
});

test('formatCount는 천 단위 쉼표', () => {
  assert.equal(formatCount(12345), '12,345');
  assert.equal(formatCount(999), '999');
});
