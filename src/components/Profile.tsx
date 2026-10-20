import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Profile } from '../lib/types';
import { Button, colors, Input } from './ui';

export const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: '동물',
    emojis: [
      '🐻', '🐰', '🐱', '🐶', '🐼', '🦊', '🐨', '🐯', '🐷', '🐥', '🐸', '🐵',
      '🦁', '🐹', '🐭', '🐮', '🐴', '🦄', '🐔', '🐧', '🦉', '🦆', '🐢', '🦖',
      '🐳', '🐬', '🐙', '🦀', '🐠', '🦋', '🐝', '🐞', '🦔', '🦦', '🐿️', '🦥',
    ],
  },
  {
    label: '사람',
    emojis: [
      '👴', '👵', '👨', '👩', '🧔', '👱‍♀️', '👦', '👧', '👶', '🧒', '🧑‍🦱', '👩‍🦰',
      '👨‍🍳', '👩‍🍳', '👨‍🏫', '👩‍🏫', '👨‍⚕️', '👩‍⚕️', '👮', '🧑‍🎓', '🧑‍💻', '🧑‍🎨', '🤴', '👸',
      '🦸', '🧚', '🧙', '🎅', '🤶', '👼',
    ],
  },
  {
    label: '표정',
    emojis: [
      '😀', '😊', '🥰', '😍', '😎', '🤓', '😇', '🤗', '😋', '😜', '🤪', '🥳',
      '😴', '🤠', '🥸', '😺', '👻', '🤖', '👽', '💩',
    ],
  },
  {
    label: '음식',
    emojis: [
      '🍎', '🍓', '🍑', '🍒', '🍉', '🍋', '🍌', '🍇', '🥑', '🌽', '🍙', '🍣',
      '🍜', '🍕', '🍔', '🍟', '🍩', '🍪', '🍰', '🧁', '🍦', '🍫', '☕', '🧋',
    ],
  },
  {
    label: '자연',
    emojis: [
      '🌸', '🌷', '🌻', '🌹', '🌼', '🍀', '🌿', '🌵', '🌳', '🍁', '🍄', '🌈',
      '☀️', '🌙', '⭐', '🌟', '❄️', '⛄', '🔥', '🌊',
    ],
  },
  {
    label: '취미',
    emojis: [
      '⚽', '🏀', '⚾', '🎾', '🏸', '⛳', '🎣', '🚴', '🏊', '🧘', '🎮', '🎨',
      '🎸', '🎹', '🎤', '📚', '✈️', '🚗', '🏕️', '📷', '🧶', '🪴', '💎', '🎁',
      '❤️', '💛', '💚', '💙', '💜', '🧡',
    ],
  },
];

export const PROFILE_EMOJIS = EMOJI_CATEGORIES.flatMap((c) => c.emojis);

export const PROFILE_COLORS = [
  '#F2735B', '#F59FB0', '#D69B2E', '#7C9A3C', '#4E9F8C', '#5A9BC4', '#5B7FD6', '#9A6BCF',
];

export const DEFAULT_PROFILE = { emoji: '🐻', color: PROFILE_COLORS[0] };

/** 예전에 만든 구성원처럼 아이콘/색이 없으면 기본값 */
export function withProfileDefaults<T extends Partial<Profile>>(p: T): T & Profile {
  return {
    ...p,
    nickname: p.nickname ?? '',
    emoji: p.emoji || DEFAULT_PROFILE.emoji,
    color: p.color || DEFAULT_PROFILE.color,
  };
}

export function Avatar({ emoji, color, size = 36 }: { emoji: string; color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.58, lineHeight: size * 0.75 }}>{emoji}</Text>
    </View>
  );
}

/** 아이콘 + 색상 고르기 */
export function ProfilePicker({
  emoji,
  color,
  onChange,
}: {
  emoji: string;
  color: string;
  onChange: (next: { emoji: string; color: string }) => void;
}) {
  const [category, setCategory] = useState(() =>
    Math.max(0, EMOJI_CATEGORIES.findIndex((c) => c.emojis.includes(emoji))),
  );
  return (
    <View>
      <View style={styles.preview}>
        <Avatar emoji={emoji} color={color} size={72} />
      </View>
      <View style={styles.categoryRow}>
        {EMOJI_CATEGORIES.map((c, i) => (
          <Pressable
            key={c.label}
            onPress={() => setCategory(i)}
            style={[styles.category, i === category && { backgroundColor: color, borderColor: color }]}
          >
            <Text style={[styles.categoryText, i === category && { color: '#fff' }]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.emojiGrid}>
        {EMOJI_CATEGORIES[category].emojis.map((e) => (
          <Pressable
            key={e}
            onPress={() => onChange({ emoji: e, color })}
            style={[styles.emojiCell, e === emoji && { borderColor: color, backgroundColor: colors.card }]}
          >
            <Text style={styles.emoji}>{e}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.colorRow}>
        {PROFILE_COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => onChange({ emoji, color: c })}
            style={[styles.colorDot, { backgroundColor: c }, c === color && styles.colorSelected]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { alignItems: 'center', marginBottom: 12 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 8 },
  category: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    margin: 3,
  },
  categoryText: { fontSize: 13, fontWeight: '700', color: colors.subtext },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  emojiCell: {
    width: 44,
    height: 44,
    margin: 3,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 },
  colorDot: { width: 32, height: 32, borderRadius: 16, margin: 5 },
  colorSelected: { borderWidth: 3, borderColor: colors.text },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: colors.bg, borderRadius: 20, flexGrow: 0, maxHeight: '90%' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 14 },
  buttons: { flexDirection: 'row', marginTop: 20 },
});

/** 설정 화면에서 내 이름/아이콘/색상 바꾸기 */
export function ProfileModal({
  visible,
  initial,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  initial: Profile;
  onClose: () => void;
  onSubmit: (profile: Profile) => Promise<void>;
}) {
  const [nickname, setNickname] = useState(initial.nickname);
  const [look, setLook] = useState({ emoji: initial.emoji, color: initial.color });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setNickname(initial.nickname);
      setLook({ emoji: initial.emoji, color: initial.color });
    }
  }, [visible, initial.nickname, initial.emoji, initial.color]);

  const submit = async () => {
    const name = nickname.trim();
    if (!name) return;
    setBusy(true);
    try {
      await onSubmit({ nickname: name, ...look });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <ScrollView style={styles.sheet} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.sheetTitle}>내 프로필</Text>
          <Input value={nickname} onChangeText={setNickname} placeholder="내 이름" maxLength={12} />
          <View style={{ height: 16 }} />
          <ProfilePicker emoji={look.emoji} color={look.color} onChange={setLook} />
          <View style={styles.buttons}>
            <Button title="취소" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Button title="저장" onPress={submit} loading={busy} style={{ flex: 1, marginLeft: 8 }} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
