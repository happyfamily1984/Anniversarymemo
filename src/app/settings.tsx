import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { NameModal } from '../components/NameModal';
import { Button, colors } from '../components/ui';
import { useGroup } from '../lib/GroupContext';
import { NOTIFY_HOUR } from '../lib/notifications';

export default function SettingsScreen() {
  const { group, session, setNickname, leaveGroup, resyncNotifications } = useGroup();
  const [editingName, setEditingName] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const code = session?.code ?? '';

  const share = () =>
    Share.share({
      message: `[우리 가족 기념일] '${group?.name ?? ''}' 그룹에 참여해 주세요!\n그룹코드: ${code}\n(비밀번호는 따로 알려드릴게요)`,
    });

  const copy = async () => {
    await Clipboard.setStringAsync(code);
    Alert.alert('그룹코드를 복사했어요');
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
    Alert.alert('그룹 나가기', '이 기기에서 그룹을 나가요. 기록은 그대로 남아 있고, 그룹코드와 비밀번호로 다시 들어올 수 있어요.', [
      { text: '취소', style: 'cancel' },
      { text: '나가기', style: 'destructive', onPress: leaveGroup },
    ]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>그룹</Text>
      <View style={styles.box}>
        <Text style={styles.groupName}>{group?.name}</Text>
        <Text style={styles.codeLabel}>그룹코드</Text>
        <Pressable onPress={copy}>
          <Text style={styles.code}>{code}</Text>
        </Pressable>
        <Text style={styles.help}>가족에게 그룹코드와 비밀번호를 알려주면 같이 기록하고 볼 수 있어요.</Text>
        <View style={styles.row}>
          <Button title="코드 복사" variant="outline" onPress={copy} style={{ flex: 1 }} />
          <Button title="공유하기" onPress={share} style={{ flex: 1, marginLeft: 8 }} />
        </View>
      </View>

      <Text style={styles.label}>내 정보</Text>
      <Pressable style={[styles.box, styles.itemRow]} onPress={() => setEditingName(true)}>
        <Text style={styles.itemText}>내 이름</Text>
        <Text style={styles.itemValue}>{session?.nickname} ›</Text>
      </Pressable>

      <Text style={styles.label}>알림</Text>
      <View style={styles.box}>
        <Text style={styles.help}>기념일 당일 오전 {NOTIFY_HOUR}시에 알림이 와요. 알림이 오지 않으면 다시 설정해 보세요.</Text>
        <Button title="알림 다시 설정" variant="outline" onPress={resync} loading={syncing} />
      </View>

      <Button title="그룹 나가기" variant="danger" onPress={confirmLeave} style={{ marginTop: 32 }} />

      <NameModal
        visible={editingName}
        title="내 이름 변경"
        initialValue={session?.nickname}
        onClose={() => setEditingName(false)}
        onSubmit={setNickname}
      />
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
  itemText: { fontSize: 16, color: colors.text },
  itemValue: { fontSize: 16, color: colors.subtext },
});
