import assert from 'node:assert/strict';
import { test } from 'node:test';

import { anniversaryKey, mergeAcrossGroups, type GroupSource } from './merge.ts';
import type { Anniversary } from './types.ts';

function ann(id: string, title: string, date: string, repeat: Anniversary['repeat'] = 'yearly'): Anniversary {
  return { id, familyId: 'f', title, date, memo: '', repeat, createdByName: '', createdAt: 0, updatedAt: 0 };
}

function group(code: string, name: string, anniversaries: Anniversary[]): GroupSource {
  return { code, name, families: [{ id: 'f', name: `${name}가족`, createdAt: 0 }], anniversaries };
}

test('띄어쓰기/연도가 달라도 매년 반복 기념일은 같은 기념일', () => {
  assert.equal(anniversaryKey(ann('a', '할머니 생신', '1950-03-01')), anniversaryKey(ann('b', '할머니생신', '1951-03-01')));
});

test('반복 방식이 다르면 다른 기념일', () => {
  assert.notEqual(anniversaryKey(ann('a', '여행', '2026-12-01', 'once')), anniversaryKey(ann('b', '여행', '2026-12-01')));
});

test('두 그룹의 같은 기념일은 하나로 합쳐지고 두 그룹 이름이 모두 들어간다', () => {
  const merged = mergeAcrossGroups([
    group('A', '김씨네', [ann('a1', '할머니 생신', '1950-03-01'), ann('a2', '결혼기념일', '2010-05-05')]),
    group('B', '이씨네', [ann('b1', '할머니 생신', '1950-03-01')]),
  ]);
  assert.equal(merged.length, 2);
  const grandma = merged.find((m) => m.anniversary.title === '할머니 생신');
  assert.deepEqual(grandma?.groupNames, ['김씨네', '이씨네']);
  const wedding = merged.find((m) => m.anniversary.title === '결혼기념일');
  assert.deepEqual(wedding?.groupNames, ['김씨네']);
});

test('같은 그룹 안의 중복도 한 번만 알림', () => {
  const merged = mergeAcrossGroups([group('A', '김씨네', [ann('a1', '설날', '2027-02-06', 'once'), ann('a2', '설날', '2027-02-06', 'once')])]);
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].groupNames, ['김씨네']);
});
