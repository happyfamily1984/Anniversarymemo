import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '../components/ui';
import { isFirebaseConfigured } from '../lib/firebase';
import { GroupProvider, useGroup } from '../lib/GroupContext';

function useOpenFromNotification(enabled: boolean) {
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const id = response?.notification.request.content.data?.anniversaryId;
    if (enabled && typeof id === 'string') router.push(`/anniversary/${id}`);
  }, [enabled, response]);
}

function RootStack() {
  const { loading, session } = useGroup();
  useOpenFromNotification(!loading && !!session);

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

  const inGroup = !!session;
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
      </Stack.Protected>
      <Stack.Protected guard={!inGroup}>
        <Stack.Screen name="join" options={{ headerShown: false }} />
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
