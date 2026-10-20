import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnniversaryCard, peopleOf } from '../components/AnniversaryCard';
import { NameModal } from '../components/NameModal';
import { Avatar } from '../components/Profile';
import { colors, EmptyText, Fab, familyColor, SectionTitle, useBottomSpace } from '../components/ui';
import { formatLongToday, sortUpcoming, todayYMD, toUpcoming } from '../lib/dates';
import { useGroup, useGroupCode } from '../lib/GroupContext';
import { addFamily } from '../lib/group';

const UPCOMING_PREVIEW = 5;

export default function HomeScreen() {
  const bottomSpace = useBottomSpace(110);
  const { group, groups, switchGroup, families, anniversaries, people, synced, session } = useGroup();
  const personById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const code = useGroupCode();
  const [showAll, setShowAll] = useState(false);
  const [addingFamily, setAddingFamily] = useState(false);

  const today = todayYMD();
  const familyIndex = useMemo(() => new Map(families.map((f, i) => [f.id, i])), [families]);

  // 지난 1회성 기념일은 홈 화면에서 제외
  const upcoming = useMemo(
    () => sortUpcoming(anniversaries.map((a) => toUpcoming(a, today))).filter((u) => u.daysLeft >= 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [anniversaries, today.y, today.m, today.d],
  );
  const visible = showAll ? upcoming : upcoming.slice(0, UPCOMING_PREVIEW);

  const countByFamily = useMemo(() => {
    const m = new Map<string, number>();
    anniversaries.forEach((a) => m.set(a.familyId, (m.get(a.familyId) ?? 0) + 1));
    return m;
  }, [anniversaries]);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: group?.name ?? '',
          headerRight: () => (
            <Pressable onPress={() => router.push('/settings')} hitSlop={10} style={styles.headerProfile}>
              {session ? <Avatar emoji={session.emoji} color={session.color} size={32} /> : null}
              <Text style={[styles.headerLink, { marginLeft: 6 }]}>설정</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: bottomSpace }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupTabs}>
          {groups.map((g) => {
            const active = g.code === code;
            return (
              <Pressable
                key={g.code}
                onPress={() => switchGroup(g.code)}
                style={[styles.groupTab, active && styles.groupTabActive]}
              >
                <Text style={[styles.groupTabText, active && styles.groupTabTextActive]} numberOfLines={1}>
                  {g.name}
                </Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => router.push('/add-group')} style={[styles.groupTab, styles.groupTabAdd]}>
            <Text style={[styles.groupTabText, { color: colors.primary }]}>＋ 가족 그룹</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.todayBox}>
          <Text style={styles.todayLabel}>오늘</Text>
          <Text style={styles.todayText}>{formatLongToday(today)}</Text>
        </View>

        {!synced ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <SectionTitle title="다가오는 기념일" />
            {upcoming.length === 0 ? (
              <EmptyText>아직 기념일이 없어요.{'\n'}아래 ＋ 버튼으로 첫 기념일을 입력해 보세요!</EmptyText>
            ) : (
              visible.map((u) => {
                const fi = familyIndex.get(u.anniversary.familyId) ?? 0;
                return (
                  <AnniversaryCard
                    key={u.anniversary.id}
                    item={u}
                    familyName={families[fi]?.name}
                    familyColor={familyColor(fi)}
                    people={peopleOf(u.anniversary.personIds, personById)}
                    onPress={() => router.push(`/anniversary/${u.anniversary.id}`)}
                  />
                );
              })
            )}
            {upcoming.length > UPCOMING_PREVIEW ? (
              <Pressable onPress={() => setShowAll((v) => !v)} style={styles.moreButton}>
                <Text style={styles.moreText}>{showAll ? '접기' : `전체 ${upcoming.length}개 보기`}</Text>
              </Pressable>
            ) : null}

            <SectionTitle
              title="가족 목록"
              right={
                <Pressable onPress={() => setAddingFamily(true)} hitSlop={10}>
                  <Text style={styles.headerLink}>＋ 가족 추가</Text>
                </Pressable>
              }
            />
            {families.length === 0 ? (
              <EmptyText>가족을 추가해 보세요. 예) 우리집, 큰집, 외가</EmptyText>
            ) : (
              <View style={styles.familyGrid}>
                {families.map((f, i) => (
                  <Pressable
                    key={f.id}
                    onPress={() => router.push(`/family/${f.id}`)}
                    style={({ pressed }) => [styles.familyCell, pressed && { opacity: 0.7 }]}
                  >
                    <View style={styles.familyCard}>
                      <View style={[styles.familyDot, { backgroundColor: familyColor(i) }]}>
                        <Text style={styles.familyInitial}>{f.name.slice(0, 1)}</Text>
                      </View>
                      <Text style={styles.familyName} numberOfLines={1}>
                        {f.name}
                      </Text>
                      <Text style={styles.familyCount}>기념일 {countByFamily.get(f.id) ?? 0}개</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Fab label="기념일 입력" onPress={() => router.push('/anniversary/new')} />

      <NameModal
        visible={addingFamily}
        title="가족 추가"
        placeholder="예) 큰집, 외가, 우리집"
        submitLabel="추가"
        onClose={() => setAddingFamily(false)}
        onSubmit={async (name) => {
          await addFamily(code, name);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 120 },
  headerProfile: { flexDirection: 'row', alignItems: 'center' },
  headerLink: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  groupTabs: { marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 14, flexGrow: 0 },
  groupTab: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    maxWidth: 160,
  },
  groupTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  groupTabAdd: { borderStyle: 'dashed', borderColor: colors.primary, marginRight: 40 },
  groupTabText: { fontSize: 15, fontWeight: '700', color: colors.subtext },
  groupTabTextActive: { color: '#fff' },
  todayBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    padding: 16,
  },
  todayLabel: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  todayText: { fontSize: 20, color: colors.text, fontWeight: '800', marginTop: 4 },
  moreButton: { alignItems: 'center', paddingVertical: 10 },
  moreText: { color: colors.primary, fontWeight: '700' },
  familyGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  familyCell: { width: '50%', padding: 5 },
  familyCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  familyDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  familyInitial: { color: '#fff', fontSize: 18, fontWeight: '800' },
  familyName: { fontSize: 16, fontWeight: '700', color: colors.text },
  familyCount: { fontSize: 13, color: colors.subtext, marginTop: 2 },
});
