import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnniversaryForm } from '../../components/AnniversaryForm';
import { Avatar } from '../../components/Profile';
import { colors, EmptyText, familyColor, useBottomSpace } from '../../components/ui';
import { formatCount, formatDate, formatDday, parseYMD, toUpcoming } from '../../lib/dates';
import { useGroup, useGroupCode } from '../../lib/GroupContext';
import { deleteAnniversary, updateAnniversary } from '../../lib/group';

export default function AnniversaryDetailScreen() {
  const bottomSpace = useBottomSpace(40);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { anniversaries, families, members, synced } = useGroup();
  const code = useGroupCode();
  const [editing, setEditing] = useState(false);

  const a = anniversaries.find((x) => x.id === id);
  if (!a) return <EmptyText>{synced ? '삭제되었거나 찾을 수 없는 기념일이에요.' : '불러오는 중…'}</EmptyText>;

  const fi = families.findIndex((f) => f.id === a.familyId);
  const family = families[fi];

  const confirmDelete = () =>
    Alert.alert('기념일 삭제', `'${a.title}'을(를) 삭제할까요? 가족 모두에게서 삭제돼요.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          router.back();
          await deleteAnniversary(code, a.id);
        },
      },
    ]);

  if (editing) {
    return (
      <>
        <Stack.Screen options={{ title: '기념일 수정', headerRight: () => null }} />
        <AnniversaryForm
          groupCode={code}
          families={families}
          members={members}
          initial={a}
          submitLabel="수정 완료"
          onSubmit={async (input) => {
            await updateAnniversary(code, a.id, input);
            setEditing(false);
          }}
          onDelete={confirmDelete}
        />
      </>
    );
  }

  const u = toUpcoming(a);
  const people = (a.personIds ?? []).map((pid) => members.find((m) => m.uid === pid)).filter((m) => !!m);
  const isPast = u.daysLeft < 0;

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingBottom: bottomSpace }]}>
      <Stack.Screen
        options={{
          title: '기념일',
          headerRight: () => (
            <Pressable onPress={() => setEditing(true)} hitSlop={10}>
              <Text style={styles.headerLink}>수정</Text>
            </Pressable>
          ),
        }}
      />
      <View style={styles.hero}>
        {family ? (
          <Text style={[styles.family, { color: familyColor(fi), borderColor: familyColor(fi) }]}>{family.name}</Text>
        ) : null}
        <Text style={styles.title}>{a.title}</Text>
        <Text style={[styles.dday, family && { color: familyColor(fi) }, u.daysLeft === 0 && { color: colors.today }]}>
          {isPast ? '지난 기념일' : formatDday(u.daysLeft)}
        </Text>
        {u.date && !isPast ? (
          <Text style={styles.next}>
            {u.daysLeft === 0 ? '오늘이에요! 🎉' : `${formatDate(u.date)}까지 ${u.daysLeft}일 남았어요`}
            {u.years > 0 ? ` · ${u.years}주년` : ''}
          </Text>
        ) : null}
      </View>

      <View style={styles.box}>
        <Row label="날짜" value={formatDate(parseYMD(a.date))} />
        {u.dayCount ? <Row label="오늘로" value={`${formatCount(u.dayCount)}일째`} /> : null}
        <Row label="알림" value={a.repeat === 'yearly' ? '매년 반복' : '1회성'} />
        {people.length > 0 ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>해당 인물</Text>
            <View style={styles.people}>
              {people.map((m) => (
                <View key={m.uid} style={styles.personItem}>
                  <Avatar emoji={m.emoji} color={m.color} size={24} />
                  <Text style={styles.personName}>{m.nickname}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        {a.createdByName ? <Row label="기록한 사람" value={a.createdByName} /> : null}
      </View>

      <Text style={styles.memoLabel}>내용</Text>
      <View style={styles.box}>
        <Text style={styles.memo}>{a.memo || '작성된 내용이 없어요.'}</Text>
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60 },
  headerLink: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  hero: { alignItems: 'center', paddingVertical: 24 },
  family: {
    fontSize: 13,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 10,
    overflow: 'hidden',
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  dday: { fontSize: 44, fontWeight: '900', color: colors.primary, marginTop: 12 },
  next: { fontSize: 15, color: colors.subtext, marginTop: 6 },
  box: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  people: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1, marginLeft: 12 },
  personItem: { flexDirection: 'row', alignItems: 'center', marginLeft: 10, marginBottom: 4 },
  personName: { fontSize: 15, color: colors.text, fontWeight: '600', marginLeft: 4 },
  rowLabel: { fontSize: 15, color: colors.subtext },
  rowValue: { fontSize: 15, color: colors.text, fontWeight: '600' },
  memoLabel: { fontSize: 14, fontWeight: '700', color: colors.subtext, marginTop: 20, marginBottom: 8 },
  memo: { fontSize: 15, color: colors.text, lineHeight: 22 },
});
