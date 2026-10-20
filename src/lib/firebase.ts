import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { FirebaseError, getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import {
  type Auth,
  getAuth,
  GoogleAuthProvider,
  initializeAuth,
  linkWithCredential,
  signInWithCredential,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

/** Firebase 콘솔 > Authentication > Google 제공업체의 '웹 클라이언트 ID' */
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
export const isGoogleConfigured = Boolean(googleWebClientId);
GoogleSignin.configure({ webClientId: googleWebClientId });

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// getReactNativePersistence는 react-native 빌드에만 존재하지만 firebase/auth 타입에는 빠져 있음
const { getReactNativePersistence } = FirebaseAuth as unknown as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => FirebaseAuth.Persistence;
};

function createAuth(): Auth {
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Fast Refresh 등으로 이미 초기화된 경우
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = getFirestore(app);

/** 로그인한 사용자의 uid. 로그인 전이면 오류 */
export function requireUid(): string {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error('먼저 구글 계정으로 로그인해 주세요.');
  return user.uid;
}

/**
 * 구글 계정으로 로그인. 사용자가 취소하면 false.
 * 예전 버전에서 쓰던 익명 계정이 있으면 구글 계정에 연결해서 가입한 그룹을 그대로 이어간다.
 */
export async function signInWithGoogle(): Promise<boolean> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const res = await GoogleSignin.signIn();
  if (!isSuccessResponse(res)) return false;
  const idToken = res.data.idToken;
  if (!idToken) throw new Error('구글 로그인 정보를 받지 못했어요. 웹 클라이언트 ID 설정을 확인해 주세요.');
  const credential = GoogleAuthProvider.credential(idToken);

  await auth.authStateReady();
  const current = auth.currentUser;
  if (current?.isAnonymous) {
    try {
      await linkWithCredential(current, credential);
      return true;
    } catch (e) {
      // 이미 다른 기기에서 쓰던 구글 계정이면 그 계정으로 로그인
      if (!(e instanceof FirebaseError && e.code === 'auth/credential-already-in-use')) throw e;
    }
  }
  await signInWithCredential(auth, credential);
  return true;
}

export async function signOut() {
  await GoogleSignin.signOut().catch(() => {});
  await firebaseSignOut(auth);
}
