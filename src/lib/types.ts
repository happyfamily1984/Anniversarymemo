export type RepeatType = 'yearly' | 'once';

export type Family = {
  id: string;
  name: string;
  createdAt: number;
};

export type Anniversary = {
  id: string;
  familyId: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  memo: string;
  repeat: RepeatType;
  /** 이 기념일에 해당하는 인물(people 문서 id) */
  personIds?: string[];
  createdByName: string;
  createdAt: number;
  updatedAt: number;
};

export type AnniversaryInput = Pick<Anniversary, 'familyId' | 'title' | 'date' | 'memo' | 'repeat' | 'personIds'>;

export type Profile = {
  nickname: string;
  emoji: string;
  color: string;
};

export type Member = Profile & { uid: string };

/** 기념일의 '해당 인물'. 앱 사용 여부와 상관없이 누구나 추가할 수 있다 */
export type Person = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  createdAt: number;
};

export type GroupInfo = {
  code: string;
  name: string;
  /** 그룹을 만든 사람(방장) */
  ownerUid?: string;
};

export type Session = Profile & {
  code: string;
  /** 내 계정 uid */
  uid?: string;
};

/** 한 가족 그룹의 실시간 데이터 */
export type GroupData = {
  info: GroupInfo | null;
  families: Family[];
  anniversaries: Anniversary[];
  people: Person[];
  /** 그룹 가입자 목록. 방장만 받을 수 있다 (다른 사람은 항상 빈 배열) */
  members: Member[];
  /** 그룹/가족/기념일/인물 4가지를 모두 한 번 이상 받았는지 */
  synced: boolean;
  /** 받은 항목 비트 플래그 (내부용) */
  parts: number;
};
