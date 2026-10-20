import type { Anniversary, Family } from './types';

export type GroupSource = {
  code: string;
  name: string;
  families: Family[];
  anniversaries: Anniversary[];
};

/** 알림 1개에 해당하는 기념일 묶음 */
export type MergedAnniversary = {
  key: string;
  /** 알림 예약 기준이 되는 기념일 (가장 이른 시작일) */
  anniversary: Anniversary;
  groupCode: string;
  /** 이 기념일이 들어 있는 가족 그룹 이름들 (중복 없음, 가입 순서) */
  groupNames: string[];
  familyNames: string[];
};

/**
 * 같은 기념일인지 판단하는 키.
 * 기념일명(띄어쓰기/대소문자 무시) + 반복 방식 + 날짜(매년 반복은 월-일만) 가 같으면 같은 기념일.
 */
export function anniversaryKey(a: Pick<Anniversary, 'title' | 'date' | 'repeat'>): string {
  const title = a.title.replace(/\s+/g, '').toLowerCase();
  const date = a.repeat === 'yearly' ? a.date.slice(5) : a.date;
  return `${a.repeat}|${date}|${title}`;
}

/** 여러 가족 그룹에 같은 기념일이 있으면 하나로 합친다 */
export function mergeAcrossGroups(groups: GroupSource[]): MergedAnniversary[] {
  const map = new Map<string, MergedAnniversary>();
  for (const g of groups) {
    const familyName = new Map(g.families.map((f) => [f.id, f.name]));
    for (const a of g.anniversaries) {
      const key = anniversaryKey(a);
      const fam = familyName.get(a.familyId);
      const cur = map.get(key);
      if (!cur) {
        map.set(key, { key, anniversary: a, groupCode: g.code, groupNames: [g.name], familyNames: fam ? [fam] : [] });
        continue;
      }
      if (!cur.groupNames.includes(g.name)) cur.groupNames.push(g.name);
      if (fam && !cur.familyNames.includes(fam)) cur.familyNames.push(fam);
      if (a.date < cur.anniversary.date) {
        cur.anniversary = a;
        cur.groupCode = g.code;
      }
    }
  }
  return [...map.values()];
}
