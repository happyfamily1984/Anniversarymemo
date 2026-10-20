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
