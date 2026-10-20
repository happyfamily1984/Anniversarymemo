import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, colors, Input } from './ui';

type Props = {
  visible: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (value: string) => Promise<void>;
};

/** 가족 이름, 내 이름처럼 한 줄 입력이 필요할 때 쓰는 팝업 */
export function NameModal({ visible, title, placeholder, initialValue = '', submitLabel = '저장', onClose, onSubmit }: Props) {
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const submit = async () => {
    const v = value.trim();
    if (!v) return;
    setBusy(true);
    try {
      await onSubmit(v);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Input
            autoFocus
            placeholder={placeholder}
            value={value}
            onChangeText={setValue}
            onSubmitEditing={submit}
            returnKeyType="done"
            maxLength={20}
          />
          <View style={styles.row}>
            <Button title="취소" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Button title={submitLabel} onPress={submit} loading={busy} style={{ flex: 1, marginLeft: 8 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: colors.bg, borderRadius: 20, padding: 20 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 14 },
  row: { flexDirection: 'row', marginTop: 16 },
});
