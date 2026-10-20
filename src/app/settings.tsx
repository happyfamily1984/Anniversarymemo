import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { Avatar, ProfileModal } from '../components/Profile';
import { Button, colors, useBottomSpace } from '../components/ui';
import { useGroup } from '../lib/GroupContext';
import { NOTIFY_HOUR } from '../lib/notifications';

export default function SettingsScreen() {
  const bottomSpace = useBottomSpace(40);
  const { group, session, setProfile, leaveGroup, resyncNotifications } = useGroup();
  const [editingName, setEditingName] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const code = session?.code ?? '';

  const share = () =>
    Share.share({
      message: `[우리 가족 기념일] '${group?.name ?? ''}' 가족 그룹에 참여해 주세요!\n초대코드: ${code}\n(비밀번호는 따로 알려드릴게요)`,
    });

  const copy = async () => {
    await Clipboard.setStringAsync(code);
    Alert.alert('초대코드를 복사했어요');
  };

  const resync = async () => {
    setSyncing(true);
    try {
      const granted = await resyncNotifications();
      if (granted) Alert.alert('알림을 다시 설정했어요');
      else
        Alert.alert('알림 권한이 꺼져 있어요', '휴대폰 설정에서 알림을 허용해 주세요.', [
          { text: '닫기', style: 'cancel' },
          { text: '설정 열기', onPress: () => Linking.openSettings() },
        ]);
    } finally {
      setSyncing(false);
    }
  };

  const confirmLeave = () =>
    Alert.alert('가족 그룹 나가기', `'${group?.name ?? ''}' 그룹에서 나가요. 기록은 그대로 남아 있고, 초대코드와 비밀번호로 다시 들어올 수 있어요.`, [
      { text: '취소', style: 'cancel' },
      { text: '나가기', style: 'destructive', onPress: leaveGroup },
    ]);

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingBottom: bottomSpace }]}>
      <Text style={styles.label}>지금 보고 있는 가족 그룹</Text>
      <View style={styles.box}>
        <Text style={styles.groupName}>{group?.name}</Text>
        <Text style={styles.codeLabel}>초대코드</Text>
        <Pressable onPress={copy}>
          <Text style={styles.code}>{code}</Text>
        </Pressable>
        <Text style={styles.help}>가족에게 초대코드와 비밀번호를 알려주면 이 가족 그룹에 들어와 같이 기록하고 볼 수 있어요.</Text>
        <View style={styles.row}>
          <Button title="코드 복사" variant="outline" onPress={copy} style={{ flex: 1 }} />
          <Button title="공유하기" onPress={share} style={{ flex: 1, marginLeft: 8 }} />
        </View>
      </View>

      <Text style={styles.label}>내 프로필 (모든 가족 그룹에 적용)</Text>
      <Pressable style={[styles.box, styles.itemRow]} onPress={() => setEditingName(true)}>
        <View style={styles.profileRow}>
          {session ? <Avatar emoji={session.emoji} color={session.color} size={44} /> : null}
          <Text style={[styles.itemText, { marginLeft: 12 }]}>{session?.nickname}</Text>
        </View>
        <Text style={styles.itemValue}>변경 ›</Text>
      </Pressable>

      <Text style={styles.label}>알림</Text>
      <View style={styles.box}>
        <Text style={styles.help}>기념일 당일 오전 {NOTIFY_HOUR}시에 알림이 와요. 알림이 오지 않으면 다시 설정해 보세요.</Text>
        <Button title="알림 다시 설정" variant="outline" onPress={resync} loading={syncing} />
      </View>

      <Button title="이 가족 그룹 나가기" variant="danger" onPress={confirmLeave} style={{ marginTop: 32 }} />

      {session ? (
        <ProfileModal
          visible={editingName}
          initial={session}
          onClose={() => setEditingName(false)}
          onSubmit={setProfile}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60 },
  label: { fontSize: 14, fontWeight: '700', color: colors.subtext, marginTop: 20, marginBottom: 8 },
  box: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  groupName: { fontSize: 20, fontWeight: '800', color: colors.text },
  codeLabel: { fontSize: 13, color: colors.subtext, marginTop: 14 },
  code: { fontSize: 32, fontWeight: '900', letterSpacing: 4, color: colors.primary, marginTop: 2 },
  help: { fontSize: 13, color: colors.subtext, marginVertical: 10, lineHeight: 19 },
  row: { flexDirection: 'row', marginTop: 4 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  itemText: { fontSize: 16, color: colors.text },
  itemValue: { fontSize: 16, color: colors.subtext },
});
