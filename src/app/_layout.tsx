import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '../components/ui';
import { isFirebaseConfigured } from '../lib/firebase';
import { GroupProvider, useGroup } from '../lib/GroupContext';

function useOpenFromNotification(enabled: boolean, switchGroup: (code: string) => void) {
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || !response) return;
    // 같은 알림 탭을 다시 처리하지 않도록 (앱을 다시 열 때마다 기념일 화면이 열리는 것 방지)
    const key = `${response.notification.request.identifier}:${response.notification.date}`;
    if (handled.current === key) return;
    handled.current = key;
    Notifications.clearLastNotificationResponse();

    const data = response.notification.request.content.data;
    const id = data?.anniversaryId;
    if (typeof id !== 'string') return;
    // 알림이 속한 가족 그룹 탭으로 바꾼 뒤 기념일 열기
    if (typeof data?.groupCode === 'string') switchGroup(data.groupCode);
    router.push(`/anniversary/${id}`);
  }, [enabled, response, switchGroup]);
}

function RootStack() {
  const { loading, signedIn, session, switchGroup } = useGroup();
  useOpenFromNotification(!loading && !!session, switchGroup);

  if (!isFirebaseConfigured) {
    return (
      <View style={styles.center}>
        <Text style={styles.setupTitle}>Firebase 설정이 필요해요</Text>
        <Text style={styles.setupText}>
          .env.example 을 .env 로 복사한 뒤 Firebase 프로젝트 값을 채우고 앱을 다시 실행해 주세요. 자세한 방법은
          README.md 를 참고하세요.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const inGroup = signedIn && !!session;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={inGroup}>
        <Stack.Screen name="index" options={{ title: '' }} />
        <Stack.Screen name="family/[id]" options={{ title: '' }} />
        <Stack.Screen name="anniversary/new" options={{ title: '새 기념일', presentation: 'modal' }} />
        <Stack.Screen name="anniversary/[id]" options={{ title: '기념일' }} />
        <Stack.Screen name="settings" options={{ title: '설정' }} />
        <Stack.Screen name="add-group" options={{ title: '가족 그룹 추가', presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !inGroup}>
        <Stack.Screen name="join" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GroupProvider>
      <StatusBar style="dark" />
      <RootStack />
    </GroupProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.bg },
  setupTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 12 },
  setupText: { fontSize: 15, color: colors.subtext, textAlign: 'center', lineHeight: 22 },
});
