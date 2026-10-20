import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { router } from 'expo-router';

import { useGroup } from '../lib/GroupContext';
import { createGroup, GroupAuthError, joinGroup, normalizeCode } from '../lib/group';
import { DEFAULT_PROFILE, ProfilePicker } from './Profile';
import { Button, colors, Field, Input } from './ui';

type Mode = 'join' | 'create';

/**
 * 가족 그룹 만들기 / 초대코드로 참여하기.
 * additional: 이미 다른 그룹에 가입한 상태에서 가족 그룹(탭)을 추가할 때. 내 프로필은 그대로 쓴다.
 */
export function JoinForm({ additional = false }: { additional?: boolean }) {
  const { enterGroup, error, session } = useGroup();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('join');
  const [groupName, setGroupName] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState(session?.nickname ?? '');
  const [look, setLook] = useState(session ? { emoji: session.emoji, color: session.color } : DEFAULT_PROFILE);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const nick = nickname.trim();
    if (!nick) return Alert.alert('내 이름을 입력해 주세요', '누가 기록했는지 가족들에게 보여져요.');
    if (password.length < 4) return Alert.alert('비밀번호는 4자리 이상으로 입력해 주세요');

    setBusy(true);
    try {
      if (mode === 'create') {
        if (!groupName.trim()) return Alert.alert('가족 그룹 이름을 입력해 주세요');
        if (password !== passwordConfirm) return Alert.alert('비밀번호가 서로 달라요');
        const profile = { nickname: nick, ...look };
        const newCode = await createGroup(groupName.trim(), password, profile);
        Alert.alert(
          '가족 그룹이 만들어졌어요! 🎉',
          `초대코드: ${newCode}\n\n가족들에게 초대코드와 비밀번호를 알려주면 함께 기록할 수 있어요. (설정 화면에서 다시 확인할 수 있어요)`,
        );
        await enterGroup(newCode, profile);
        if (additional) router.back();
      } else {
        if (normalizeCode(code).length < 4) return Alert.alert('초대코드를 확인해 주세요');
        const profile = { nickname: nick, ...look };
        const joined = await joinGroup(code, password, profile);
        await enterGroup(joined, profile);
        if (additional) router.back();
      }
    } catch (e) {
      if (e instanceof GroupAuthError) Alert.alert('참여할 수 없어요', e.message);
      else Alert.alert('문제가 생겼어요', String((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={additional ? ['left', 'right'] : ['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 40 + insets.bottom }]} keyboardShouldPersistTaps="handled">
          {additional ? (
            <Text style={styles.subtitle}>
              다른 가족 그룹을 탭으로 추가해요.{'\n'}참여하려면 그 그룹의 초대코드와 비밀번호가 필요해요.
            </Text>
          ) : (
            <>
              <Text style={styles.logo}>🎂</Text>
              <Text style={styles.title}>우리 가족 기념일</Text>
              <Text style={styles.subtitle}>가족의 소중한 날을 함께 기록하고{'\n'}매년 잊지 않게 알려드려요</Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </>
          )}

          <View style={styles.tabs}>
            {(
              [
                ['join', '초대코드로 참여'],
                ['create', '새 가족 그룹 만들기'],
              ] as const
            ).map(([value, label]) => (
              <Pressable key={value} onPress={() => setMode(value)} style={[styles.tab, mode === value && styles.tabActive]}>
                <Text style={[styles.tabText, mode === value && styles.tabTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          {mode === 'create' ? (
            <Field label="가족 그룹 이름">
              <Input placeholder="예) 김씨네 대가족, 처가" value={groupName} onChangeText={setGroupName} maxLength={20} />
            </Field>
          ) : (
            <Field label="초대코드">
              <Input
                placeholder="예) K7P2QX"
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
              />
            </Field>
          )}

          <Field label="비밀번호">
            <Input
              placeholder="4자리 이상"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              keyboardType="number-pad"
            />
          </Field>

          {mode === 'create' ? (
            <Field label="비밀번호 확인">
              <Input value={passwordConfirm} onChangeText={setPasswordConfirm} secureTextEntry keyboardType="number-pad" />
            </Field>
          ) : null}

          {additional ? null : (
            <>
              <Field label="내 이름 (가족들에게 보여져요)">
                <Input placeholder="예) 둘째딸, 아빠" value={nickname} onChangeText={setNickname} maxLength={12} />
              </Field>

              <Field label="내 아이콘과 색상">
                <ProfilePicker emoji={look.emoji} color={look.color} onChange={setLook} />
              </Field>
            </>
          )}

          <Button title={mode === 'create' ? '가족 그룹 만들기' : '참여하기'} onPress={submit} loading={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 24 },
  logo: { fontSize: 56, textAlign: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 15, color: colors.subtext, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  error: { color: colors.danger, textAlign: 'center', marginTop: 16 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    padding: 4,
    marginTop: 24,
    marginBottom: 24,
  },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 11, alignItems: 'center' },
  tabActive: { backgroundColor: colors.card },
  tabText: { fontSize: 15, fontWeight: '700', color: colors.subtext },
  tabTextActive: { color: colors.primary },
});
