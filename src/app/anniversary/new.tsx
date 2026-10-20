import { router, useLocalSearchParams } from 'expo-router';

import { AnniversaryForm } from '../../components/AnniversaryForm';
import { useGroup, useGroupCode } from '../../lib/GroupContext';
import { addAnniversary } from '../../lib/group';

export default function NewAnniversaryScreen() {
  const { familyId } = useLocalSearchParams<{ familyId?: string }>();
  const { families, people, session } = useGroup();
  const code = useGroupCode();

  return (
    <AnniversaryForm
      groupCode={code}
      families={families}
      people={people}
      initial={{ familyId }}
      submitLabel="저장하기"
      onSubmit={async (input) => {
        await addAnniversary(code, input, session?.nickname ?? '');
        router.back();
      }}
    />
  );
}
