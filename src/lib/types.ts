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
  /** 이 기념일에 해당하는 인물(그룹 구성원 uid) */
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

export type GroupInfo = {
  code: string;
  name: string;
};

export type Session = Profile & {
  code: string;
};

/** 한 가족 그룹의 실시간 데이터 */
export type GroupData = {
  info: GroupInfo | null;
  families: Family[];
  anniversaries: Anniversary[];
  members: Member[];
  /** 그룹/가족/기념일/구성원 4가지를 모두 한 번 이상 받았는지 */
  synced: boolean;
  /** 받은 항목 비트 플래그 (내부용) */
  parts: number;
};
