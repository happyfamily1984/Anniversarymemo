import { useFonts } from '@expo-google-fonts/nanum-pen-script/useFonts';
import { NanumPenScript_400Regular } from '@expo-google-fonts/nanum-pen-script/400Regular';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnniversaryCard, peopleOf } from '../components/AnniversaryCard';
import { FooterWave, InitialBadge, ScreenBackground, SectionHeader } from '../components/Decor';
import { NameModal } from '../components/NameModal';
import { Avatar } from '../components/Profile';
import { colors, EmptyText, Fab, familyColor, useBottomSpace } from '../components/ui';
import { formatLongToday, sortUpcoming, todayYMD, toUpcoming } from '../lib/dates';
import { useGroup, useGroupCode } from '../lib/GroupContext';
import { addFamily } from '../lib/group';

const UPCOMING_PREVIEW = 5;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const bottomSpace = useBottomSpace(0);
  const [fontsLoaded] = useFonts({ NanumPenScript_400Regular });
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
  const hasMore = upcoming.length > UPCOMING_PREVIEW;

  const countByFamily = useMemo(() => {
    const m = new Map<string, number>();
    anniversaries.forEach((a) => m.set(a.familyId, (m.get(a.familyId) ?? 0) + 1));
    return m;
  }, [anniversaries]);

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 12, paddingBottom: bottomSpace }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더: 그룹 이름 + 내 프로필/설정 */}
        <View style={styles.header}>
          <Text style={styles.groupName} numberOfLines={1}>
            {group?.name ?? ''}
          </Text>
          <Pressable onPress={() => router.push('/settings')} hitSlop={10} style={styles.headerProfile}>
            {session ? <Avatar emoji={session.emoji} color={session.color} size={44} /> : null}
            <Text style={styles.headerLink}>설정</Text>
          </Pressable>
        </View>

        {/* 가족 그룹 탭 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupTabs}>
          {groups.map((g) => {
            const active = g.code === code;
            return (
              <Pressable
                key={g.code}
                onPress={() => switchGroup(g.code)}
                style={[styles.groupTab, active ? styles.groupTabActive : styles.groupTabIdle]}
              >
                <MaterialCommunityIcons
                  name={active ? 'calendar-heart' : 'account-multiple'}
                  size={18}
                  color={active ? '#fff' : colors.subtext}
                />
                <Text style={[styles.groupTabText, active && styles.groupTabTextActive]} numberOfLines={1}>
                  {g.name}
                </Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => router.push('/add-group')} style={[styles.groupTab, styles.groupTabAdd]}>
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={[styles.groupTabText, { color: colors.primary }]}>가족 그룹</Text>
          </Pressable>
        </ScrollView>

        {/* 오늘 카드 */}
        <LinearGradient
          colors={['#FFEAE5', '#FFE0D8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.todayCard}
        >
          <Image source={require('../../assets/images/today-calendar.png')} style={styles.todayCalendar} />
          <View style={styles.todayTextBox}>
            <Text style={styles.todayLabel}>오늘</Text>
            <Text style={styles.todayText} numberOfLines={1} adjustsFontSizeToFit>
              {formatLongToday(today)}
            </Text>
          </View>
          <Image source={require('../../assets/images/today-cake.png')} style={styles.todayCake} />
        </LinearGradient>

        {!synced ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <SectionHeader
              title="다가오는 기념일"
              right={
                hasMore ? (
                  <Pressable onPress={() => setShowAll((v) => !v)} hitSlop={10} style={styles.moreLink}>
                    <Text style={styles.moreLinkText}>{showAll ? '접기' : '더보기'}</Text>
                    <Ionicons name={showAll ? 'chevron-up' : 'chevron-forward'} size={16} color={colors.subtext} />
                  </Pressable>
                ) : undefined
              }
            />
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
            {hasMore ? (
              <Pressable onPress={() => setShowAll((v) => !v)} style={styles.allButton}>
                <View style={styles.dot} />
                <Text style={styles.allButtonText}>{showAll ? '접기' : `전체 ${upcoming.length}개 보기`}</Text>
                <View style={styles.dot} />
              </Pressable>
            ) : null}

            <SectionHeader
              title="가족 목록"
              right={
                <Pressable onPress={() => setAddingFamily(true)} hitSlop={8} style={styles.addFamilyButton}>
                  <Ionicons name="add" size={18} color={colors.primary} />
                  <Text style={styles.addFamilyText}>가족 추가</Text>
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
                    style={({ pressed }) => [styles.familyCell, pressed && { opacity: 0.75 }]}
                  >
                    <View style={styles.familyCard}>
                      <View style={styles.familyTop}>
                        <InitialBadge text={f.name.slice(0, 1)} color={familyColor(i)} />
                        <View style={styles.familyChevron}>
                          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                        </View>
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

        <FooterWave height={150 + insets.bottom} fontsLoaded={fontsLoaded} />
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
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  groupName: { fontSize: 30, fontWeight: '900', color: colors.text, flexShrink: 1, marginRight: 12 },
  headerProfile: { flexDirection: 'row', alignItems: 'center' },
  headerLink: { color: colors.primary, fontSize: 17, fontWeight: '800', marginLeft: 8 },

  groupTabs: { marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 18, flexGrow: 0 },
  groupTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    height: 46,
    borderRadius: 23,
    marginRight: 10,
    maxWidth: 190,
  },
  groupTabActive: {
    backgroundColor: colors.primary,
    shadowColor: '#E2503C',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  groupTabIdle: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupTabAdd: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, marginRight: 40 },
  groupTabText: { fontSize: 16, fontWeight: '800', color: colors.text, marginLeft: 6 },
  groupTabTextActive: { color: '#fff' },

  todayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    minHeight: 104,
    paddingLeft: 10,
    overflow: 'hidden',
  },
  todayCalendar: { width: 62, height: 74, resizeMode: 'contain' },
  todayTextBox: { flex: 1, marginLeft: 6, marginRight: 96 },
  todayLabel: { fontSize: 15, color: colors.primary, fontWeight: '800' },
  todayText: { fontSize: 16, color: colors.text, fontWeight: '900', marginTop: 4 },
  todayCake: { position: 'absolute', right: -10, top: 2, width: 112, height: 98, resizeMode: 'contain' },

  moreLink: { flexDirection: 'row', alignItems: 'center' },
  moreLinkText: { color: colors.subtext, fontSize: 15, fontWeight: '600', marginRight: 2 },
  allButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 4,
    paddingHorizontal: 22,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: '#F7D3CB',
  },
  allButtonText: { color: colors.primary, fontSize: 16, fontWeight: '800', marginHorizontal: 12 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary },

  addFamilyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(253,229,223,0.8)',
  },
  addFamilyText: { color: colors.primary, fontSize: 15, fontWeight: '800', marginLeft: 2 },

  familyGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  familyCell: { width: '50%', padding: 6 },
  familyCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    shadowColor: '#E9A59A',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  familyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  familyChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FDEBE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyName: { fontSize: 19, fontWeight: '900', color: colors.text },
  familyCount: { fontSize: 14, color: colors.subtext, marginTop: 4 },
});
