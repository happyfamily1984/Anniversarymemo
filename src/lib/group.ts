import * as Crypto from 'expo-crypto';
import { FirebaseError } from 'firebase/app';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db, requireUid } from './firebase';
import type { AnniversaryInput, Person, Profile } from './types';

// 헷갈리는 문자(0/O, 1/I/L) 제외
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

export class GroupAuthError extends Error {}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function generateCode(): string {
  const bytes = Crypto.getRandomBytes(CODE_LENGTH);
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

function isPermissionDenied(e: unknown): boolean {
  return e instanceof FirebaseError && e.code === 'permission-denied';
}

async function addMember(code: string, uid: string, profile: Profile) {
  await setDoc(
    doc(db, 'groups', code, 'members', uid),
    {
      nickname: profile.nickname,
      emoji: profile.emoji,
      color: profile.color,
      joinedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/** 새 가족 그룹을 만들고 초대코드를 돌려준다 */
export async function createGroup(name: string, profile: Profile): Promise<string> {
  const uid = requireUid();
  // 이미 존재하는 코드에 setDoc 하면 보안 규칙상 거부되므로 새 코드로 재시도
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      await setDoc(doc(db, 'groups', code), { name, ownerUid: uid, createdAt: serverTimestamp() });
    } catch (e) {
      if (isPermissionDenied(e)) continue;
      throw e;
    }
    await addMember(code, uid, profile);
    return code;
  }
  throw new Error('초대코드를 만들지 못했습니다. 다시 시도해 주세요.');
}

/** 초대코드로 가족 그룹에 참여 */
export async function joinGroup(rawCode: string, profile: Profile): Promise<string> {
  const code = normalizeCode(rawCode);
  const uid = requireUid();
  try {
    await addMember(code, uid, profile);
  } catch (e) {
    if (isPermissionDenied(e)) throw new GroupAuthError('초대코드가 올바르지 않습니다.');
    throw e;
  }
  return code;
}

export async function leaveGroup(code: string) {
  await deleteDoc(doc(db, 'groups', code, 'members', requireUid()));
}

export async function updateProfile(code: string, profile: Profile) {
  await updateDoc(doc(db, 'groups', code, 'members', requireUid()), {
    nickname: profile.nickname,
    emoji: profile.emoji,
    color: profile.color,
  });
}

// ---- 가족 ----

export async function addFamily(code: string, name: string): Promise<string> {
  const ref = await addDoc(collection(db, 'groups', code, 'families'), {
    name,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function renameFamily(code: string, familyId: string, name: string) {
  await updateDoc(doc(db, 'groups', code, 'families', familyId), { name });
}

/** 가족과 그 가족의 기념일을 모두 삭제 */
export async function deleteFamily(code: string, familyId: string) {
  const snap = await getDocs(
    query(collection(db, 'groups', code, 'anniversaries'), where('familyId', '==', familyId)),
  );
  const batch = writeBatch(db);
  snap.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'groups', code, 'families', familyId));
  await batch.commit();
}

// ---- 해당 인물 ----

export async function addPerson(code: string, person: Pick<Person, 'name' | 'emoji' | 'color'>): Promise<string> {
  const ref = await addDoc(collection(db, 'groups', code, 'people'), { ...person, createdAt: Date.now() });
  return ref.id;
}

export async function deletePerson(code: string, personId: string) {
  await deleteDoc(doc(db, 'groups', code, 'people', personId));
}

// ---- 기념일 ----

export async function addAnniversary(code: string, input: AnniversaryInput, createdByName: string) {
  const now = Date.now();
  await addDoc(collection(db, 'groups', code, 'anniversaries'), {
    ...input,
    personIds: input.personIds ?? [],
    createdByName,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateAnniversary(code: string, id: string, input: AnniversaryInput) {
  await updateDoc(doc(db, 'groups', code, 'anniversaries', id), {
    ...input,
    personIds: input.personIds ?? [],
    updatedAt: Date.now(),
  });
}

export async function deleteAnniversary(code: string, id: string) {
  await deleteDoc(doc(db, 'groups', code, 'anniversaries', id));
}
