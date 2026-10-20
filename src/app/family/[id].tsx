import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnniversaryCard, peopleOf } from '../../components/AnniversaryCard';
import { NameModal } from '../../components/NameModal';
import { colors, EmptyText, Fab, familyColor, useBottomSpace } from '../../components/ui';
import { sortUpcoming, toUpcoming } from '../../lib/dates';
import { useGroup, useGroupCode } from '../../lib/GroupContext';
import { deleteFamily, renameFamily } from '../../lib/group';

export default function FamilyScreen() {
  const bottomSpace = useBottomSpace(110);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { families, anniversaries, people } = useGroup();
  const personById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const code = useGroupCode();
  const [renaming, setRenaming] = useState(false);

  const index = families.findIndex((f) => f.id === id);
  const family = families[index];
  const color = familyColor(index);

  const items = useMemo(
    () => sortUpcoming(anniversaries.filter((a) => a.familyId === id).map((a) => toUpcoming(a))),
    [anniversaries, id],
  );

  const confirmDelete = () => {
    Alert.alert(
      `'${family?.name}' 삭제`,
      `이 가족과 기념일 ${items.length}개가 모든 구성원에게서 삭제돼요. 계속할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            router.back();
            await deleteFamily(code, id);
          },
        },
      ],
    );
  };

  const openMenu = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['이름 변경', '가족 삭제', '취소'], destructiveButtonIndex: 1, cancelButtonIndex: 2 },
        (i) => {
          if (i === 0) setRenaming(true);
          if (i === 1) confirmDelete();
        },
      );
    } else {
      Alert.alert(family?.name ?? '', undefined, [
        { text: '이름 변경', onPress: () => setRenaming(true) },
        { text: '가족 삭제', style: 'destructive', onPress: confirmDelete },
        { text: '취소', style: 'cancel' },
      ]);
    }
  };

  if (!family) {
    return <EmptyText>가족 정보를 찾을 수 없어요.</EmptyText>;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: family.name,
          headerRight: () => (
            <Pressable onPress={openMenu} hitSlop={10}>
              <Text style={styles.headerLink}>편집</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: bottomSpace }]}>
        <View style={[styles.banner, { backgroundColor: color }]}>
          <Text style={styles.bannerName}>{family.name}</Text>
          <Text style={styles.bannerCount}>기념일 {items.length}개</Text>
        </View>
        {items.length === 0 ? (
          <EmptyText>아직 등록된 기념일이 없어요.</EmptyText>
        ) : (
          items.map((u) => (
            <AnniversaryCard
              key={u.anniversary.id}
              item={u}
              familyColor={color}
              people={peopleOf(u.anniversary.personIds, personById)}
              onPress={() => router.push(`/anniversary/${u.anniversary.id}`)}
            />
          ))
        )}
      </ScrollView>

      <Fab
        label="기념일 입력"
        onPress={() => router.push({ pathname: '/anniversary/new', params: { familyId: family.id } })}
      />

      <NameModal
        visible={renaming}
        title="가족 이름 변경"
        initialValue={family.name}
        onClose={() => setRenaming(false)}
        onSubmit={(name) => renameFamily(code, family.id, name)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 120 },
  headerLink: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  banner: { borderRadius: 18, padding: 20, marginBottom: 18 },
  bannerName: { color: '#fff', fontSize: 24, fontWeight: '800' },
  bannerCount: { color: '#fff', fontSize: 14, marginTop: 4, opacity: 0.9 },
});
