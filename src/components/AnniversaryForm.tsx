import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatDate, parseYMD, toYMDString, ymdToDate } from '../lib/dates';
import { addFamily } from '../lib/group';
import { NOTIFY_HOUR } from '../lib/notifications';
import type { AnniversaryInput, Family, Member, RepeatType } from '../lib/types';
import { Avatar } from './Profile';
import { Button, Chip, colors, familyColor, Field, Input, useBottomSpace } from './ui';

type Props = {
  groupCode: string;
  families: Family[];
  members: Member[];
  initial?: Partial<AnniversaryInput>;
  submitLabel: string;
  onSubmit: (input: AnniversaryInput) => Promise<void>;
  onDelete?: () => void;
};

export function AnniversaryForm({ groupCode, families, members, initial, submitLabel, onSubmit, onDelete }: Props) {
  const bottomSpace = useBottomSpace(40);
  const [familyId, setFamilyId] = useState(initial?.familyId ?? families[0]?.id ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(initial?.date ?? toYMDString(new Date()));
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [repeat, setRepeat] = useState<RepeatType>(initial?.repeat ?? 'yearly');
  const [personIds, setPersonIds] = useState<string[]>(initial?.personIds ?? []);

  const togglePerson = (uid: string) =>
    setPersonIds((prev) => (prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]));
  const [showPicker, setShowPicker] = useState(false);
  const [newFamilyOpen, setNewFamilyOpen] = useState(families.length === 0);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [addingFamily, setAddingFamily] = useState(false);
  const [saving, setSaving] = useState(false);

  const onPickDate = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'set' && selected) setDate(toYMDString(selected));
  };

  const createFamily = async () => {
    const name = newFamilyName.trim();
    if (!name) return;
    setAddingFamily(true);
    try {
      const id = await addFamily(groupCode, name);
      setFamilyId(id);
      setNewFamilyName('');
      setNewFamilyOpen(false);
    } catch (e) {
      Alert.alert('가족을 추가하지 못했어요', String((e as Error).message));
    } finally {
      setAddingFamily(false);
    }
  };

  const submit = async () => {
    if (!familyId) return Alert.alert('가족을 선택해 주세요');
    if (!title.trim()) return Alert.alert('기념일명을 입력해 주세요');
    setSaving(true);
    try {
      // 그룹을 나간 사람은 저장 시 제외
      const known = personIds.filter((id) => members.some((m) => m.uid === id));
      await onSubmit({ familyId, title: title.trim(), date, memo: memo.trim(), repeat, personIds: known });
    } catch (e) {
      Alert.alert('저장하지 못했어요', String((e as Error).message));
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: bottomSpace }]} keyboardShouldPersistTaps="handled">
        <Field label="누구네 가족인가요?">
          <View style={styles.chips}>
            {families.map((f, i) => (
              <Chip
                key={f.id}
                label={f.name}
                color={familyColor(i)}
                selected={f.id === familyId}
                onPress={() => setFamilyId(f.id)}
              />
            ))}
            <Chip label="＋ 새 가족" color={colors.subtext} onPress={() => setNewFamilyOpen((v) => !v)} />
          </View>
          {newFamilyOpen ? (
            <View style={styles.newFamilyRow}>
              <Input
                style={{ flex: 1 }}
                placeholder="예) 큰집, 외가, 우리집"
                value={newFamilyName}
                onChangeText={setNewFamilyName}
                onSubmitEditing={createFamily}
                returnKeyType="done"
              />
              <Button title="추가" onPress={createFamily} loading={addingFamily} style={{ marginLeft: 8 }} />
            </View>
          ) : null}
        </Field>

        {members.length > 0 ? (
          <Field label="해당 인물 (여러 명 선택 가능)">
            <View style={styles.chips}>
              {members.map((m) => {
                const on = personIds.includes(m.uid);
                return (
                  <Pressable
                    key={m.uid}
                    onPress={() => togglePerson(m.uid)}
                    style={[styles.person, on && { borderColor: m.color, backgroundColor: colors.card }]}
                  >
                    <Avatar emoji={m.emoji} color={m.color} size={28} />
                    <Text style={[styles.personName, on && { color: m.color }]}>{m.nickname}</Text>
                    <Text style={[styles.check, { color: on ? m.color : colors.border }]}>{on ? '✔' : '○'}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>
        ) : null}

        <Field label="기념일명">
          <Input placeholder="예) 할머니 생신, 결혼기념일" value={title} onChangeText={setTitle} maxLength={40} />
        </Field>

        <Field label="날짜">
          <Pressable style={styles.dateButton} onPress={() => setShowPicker((v) => !v)}>
            <Text style={styles.dateText}>{formatDate(parseYMD(date))}</Text>
            <Text style={styles.dateHint}>{showPicker && Platform.OS === 'ios' ? '닫기' : '변경'}</Text>
          </Pressable>
          {showPicker ? (
            <DateTimePicker
              value={ymdToDate(parseYMD(date))}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              locale="ko-KR"
              onChange={onPickDate}
            />
          ) : null}
        </Field>

        <Field label="알림">
          <View style={styles.segment}>
            {(
              [
                ['yearly', '매년 반복'],
                ['once', '1회성'],
              ] as const
            ).map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => setRepeat(value)}
                style={[styles.segmentItem, repeat === value && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, repeat === value && styles.segmentTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.help}>
            {repeat === 'yearly'
              ? `매년 이 날짜 오전 ${NOTIFY_HOUR}시에 알려드려요.`
              : `이 날짜 오전 ${NOTIFY_HOUR}시에 한 번만 알려드려요.`}
          </Text>
        </Field>

        <Field label="내용">
          <Input
            placeholder="선물 아이디어, 장소, 메모 등"
            value={memo}
            onChangeText={setMemo}
            multiline
            style={{ minHeight: 110, textAlignVertical: 'top' }}
          />
        </Field>

        <Button title={submitLabel} onPress={submit} loading={saving} />
        {onDelete ? <Button title="삭제" variant="danger" onPress={onDelete} style={{ marginTop: 12 }} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 999,
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  personName: { fontSize: 14, fontWeight: '600', color: colors.text, marginLeft: 6 },
  check: { fontSize: 14, fontWeight: '800', marginLeft: 6 },
  newFamilyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateText: { fontSize: 16, color: colors.text, fontWeight: '600' },
  dateHint: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 4,
  },
  segmentItem: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.card },
  segmentText: { fontSize: 15, fontWeight: '600', color: colors.subtext },
  segmentTextActive: { color: colors.primary },
  help: { fontSize: 13, color: colors.subtext, marginTop: 8 },
});
