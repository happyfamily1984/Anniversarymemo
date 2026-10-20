import { statusCodes } from '@react-native-google-signin/google-signin';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../components/ui';
import { isGoogleConfigured, signInWithGoogle } from '../lib/firebase';

export default function LoginScreen() {
  const [busy, setBusy] = useState(false);

  const login = async () => {
    if (!isGoogleConfigured) {
      return Alert.alert('구글 로그인 설정이 필요해요', 'GitHub 시크릿에 GOOGLE_WEB_CLIENT_ID 를 등록한 뒤 앱을 다시 만들어 주세요.');
    }
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === statusCodes.IN_PROGRESS) return;
      if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Google Play 서비스가 필요해요', 'Play 스토어에서 Google Play 서비스를 업데이트해 주세요.');
      } else if (code === 'DEVELOPER_ERROR' || code === '10') {
        Alert.alert(
          '구글 로그인 설정 오류',
          'Firebase 프로젝트에 안드로이드 앱(패키지 이름, SHA-1)이 등록됐는지, 웹 클라이언트 ID가 맞는지 확인해 주세요.',
        );
      } else {
        Alert.alert('로그인하지 못했어요', String((e as Error).message));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.logo}>🎂</Text>
        <Text style={styles.title}>우리 가족 기념일</Text>
        <Text style={styles.subtitle}>가족의 소중한 날을 함께 기록하고{'\n'}매년 잊지 않게 알려드려요</Text>
      </View>

      <Pressable
        onPress={login}
        disabled={busy}
        style={({ pressed }) => [styles.googleButton, (pressed || busy) && { opacity: 0.6 }]}
      >
        <Text style={styles.googleG}>G</Text>
        <Text style={styles.googleText}>{busy ? '로그인 중…' : '구글 계정으로 시작하기'}</Text>
      </Pressable>
      <Text style={styles.help}>구글 계정에 가족 그룹과 프로필이 저장돼서{'\n'}휴대폰을 바꿔도 그대로 이어서 쓸 수 있어요.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center' },
  center: { alignItems: 'center', marginBottom: 48 },
  logo: { fontSize: 72 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 8 },
  subtitle: { fontSize: 15, color: colors.subtext, textAlign: 'center', marginTop: 10, lineHeight: 22 },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  googleG: { fontSize: 20, fontWeight: '900', color: '#4285F4', marginRight: 10 },
  googleText: { fontSize: 16, fontWeight: '700', color: colors.text },
  help: { fontSize: 13, color: colors.subtext, textAlign: 'center', marginTop: 16, lineHeight: 19 },
});
