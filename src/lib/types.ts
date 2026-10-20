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
  createdByName: string;
  createdAt: number;
  updatedAt: number;
};

export type AnniversaryInput = Pick<Anniversary, 'familyId' | 'title' | 'date' | 'memo' | 'repeat'>;

export type GroupInfo = {
  code: string;
  name: string;
};

export type Session = {
  code: string;
  nickname: string;
};
