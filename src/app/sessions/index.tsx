import { router } from 'expo-router';

import { Button, Card, EmptyState, ListRow, Screen } from '@/components/ui';
import { getRepos } from '@/db/database';
import { useAsync } from '@/hooks/useAsync';
import { spacing } from '@/theme/tokens';
import { relativeDate } from '@/utils/format';

export default function Sessions() {
  const { data } = useAsync(() => getRepos().sessions.list(), []);
  return (
    <Screen title="Batch sessions" back>
      {data && data.length === 0 ? (
        <EmptyState
          icon="layers-outline"
          title="No saved sessions"
          message="Batch scanning is great for inventory, events and asset checks."
          cta="Start batch scan"
          onCta={() => router.push('/scan/batch')}
        />
      ) : (
        <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
          {(data ?? []).map((s) => (
            <ListRow
              key={s.id}
              icon="layers-outline"
              title={s.name}
              subtitle={`${s.itemCount} codes · ${relativeDate(s.createdAt)}`}
              onPress={() => router.push({ pathname: '/sessions/[id]', params: { id: s.id, name: s.name } })}
              chevron
            />
          ))}
        </Card>
      )}
      {data && data.length > 0 && <Button title="New batch scan" icon="scan" onPress={() => router.push('/scan/batch')} />}
    </Screen>
  );
}
