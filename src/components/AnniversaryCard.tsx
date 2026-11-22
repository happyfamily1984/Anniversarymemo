import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatCount, formatDate, formatDday, type Upcoming } from '../lib/dates';
import type { Person } from '../lib/types';
import { lighten } from './Decor';
import { Avatar } from './Profile';
import { colors } from './ui';

type Props = {
  item: Upcoming;
  familyName?: string;
  familyColor?: string;
  /** 해당 인물 */
  people?: Person[];
  onPress: () => void;
};

export function AnniversaryCard({ item, familyName, familyColor = colors.primary, people = [], onPress }: Props) {
  const { anniversary: a, date, daysLeft, years, dayCount } = item;
  const isToday = daysLeft === 0;
  const isPast = daysLeft < 0;
  const boxColor = isPast ? '#CFC6BF' : familyColor;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, isToday && styles.todayCard, isPast && styles.pastCard, pressed && { opacity: 0.75 }]}
    >
      <LinearGradient
        colors={[lighten(boxColor, 0.18), boxColor]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.dday}
      >
        <Text style={styles.ddayText} numberOfLines={1} adjustsFontSizeToFit>
          {isPast ? '지남' : formatDday(daysLeft)}
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {a.title}
          {years > 0 ? <Text style={styles.years}>  {years}주년</Text> : null}
          {dayCount ? <Text style={styles.dayCount}>  {formatCount(dayCount)}일째</Text> : null}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.subtext} />
          <Text style={styles.meta} numberOfLines={1}>
            {' '}
            {date ? formatDate(date) : ''}
            {isToday ? ' · 오늘!' : daysLeft > 0 ? ` · ${daysLeft}일 남음` : ''}
          </Text>
        </View>
        <View style={styles.tags}>
          {familyName ? (
            <Text style={[styles.tag, { color: familyColor, borderColor: familyColor }]}>{familyName}</Text>
          ) : null}
          <Text style={[styles.tag, styles.repeatTag]}>{a.repeat === 'yearly' ? '매년' : '1회'}</Text>
          {people.map((p) => (
            <View key={p.id} style={styles.person}>
              <Avatar emoji={p.emoji} color={p.color} size={22} />
            </View>
          ))}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={22} color="#9C8F87" />
    </Pressable>
  );
}

export function peopleOf(ids: string[] | undefined, byId: Map<string, Person>): Person[] {
  return (ids ?? []).map((id) => byId.get(id)).filter((p): p is Person => !!p);
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 22,
    paddingVertical: 16,
    paddingLeft: 16,
    paddingRight: 12,
    marginBottom: 12,
    shadowColor: '#E9A59A',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  todayCard: { borderColor: colors.today, borderWidth: 2 },
  pastCard: { opacity: 0.6 },
  dday: {
    width: 76,
    height: 62,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: 12,
  },
  ddayText: { color: '#fff', fontWeight: '800', fontSize: 20 },
  body: { flex: 1 },
  title: { fontSize: 16, fontWeight: '800', color: colors.text },
  years: { fontSize: 13, fontWeight: '800', color: colors.primary },
  dayCount: { fontSize: 12, fontWeight: '700', color: '#7A6E66' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  meta: { fontSize: 13, color: colors.subtext, flexShrink: 1 },
  tags: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 8 },
  tag: {
    fontSize: 12,
    fontWeight: '700',
    borderWidth: 1.2,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
    overflow: 'hidden',
  },
  repeatTag: { color: colors.subtext, borderColor: '#E5DAD4' },
  person: { marginRight: 3 },
});
