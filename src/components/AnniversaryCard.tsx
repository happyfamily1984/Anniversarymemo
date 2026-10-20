import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatCount, formatDate, formatDday, type Upcoming } from '../lib/dates';
import type { Person } from '../lib/types';
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

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, isToday && styles.todayCard, isPast && styles.pastCard, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.dday, { backgroundColor: isPast ? '#CFC6BF' : familyColor }, isToday && styles.ddayToday]}>
        <Text style={styles.ddayText}>{isPast ? '지남' : formatDday(daysLeft)}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {a.title}
          {years > 0 ? <Text style={styles.years}>  {years}주년</Text> : null}
          {dayCount ? <Text style={styles.dayCount}>  {formatCount(dayCount)}일째</Text> : null}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {date ? formatDate(date) : ''}
          {isToday ? ' · 오늘!' : daysLeft > 0 ? ` · ${daysLeft}일 남음` : ''}
        </Text>
        <View style={styles.tags}>
          {familyName ? (
            <Text style={[styles.tag, { color: familyColor, borderColor: familyColor }]}>{familyName}</Text>
          ) : null}
          <Text style={[styles.tag, styles.repeatTag]}>{a.repeat === 'yearly' ? '매년' : '1회'}</Text>
          {people.map((p) => (
            <View key={p.id} style={styles.person}>
              <Avatar emoji={p.emoji} color={p.color} size={20} />
            </View>
          ))}
        </View>
      </View>
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
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  todayCard: { borderColor: colors.today, borderWidth: 2 },
  pastCard: { opacity: 0.6 },
  dday: {
    minWidth: 72,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginRight: 14,
  },
  ddayToday: { borderWidth: 3, borderColor: colors.today },
  person: { marginRight: 3 },
  ddayText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  body: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  years: { fontSize: 13, fontWeight: '700', color: colors.primary },
  dayCount: { fontSize: 13, fontWeight: '600', color: colors.subtext },
  meta: { fontSize: 13, color: colors.subtext, marginTop: 3 },
  tags: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 6 },
  tag: {
    fontSize: 12,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginRight: 6,
    overflow: 'hidden',
  },
  repeatTag: { color: colors.subtext, borderColor: colors.border },
});
