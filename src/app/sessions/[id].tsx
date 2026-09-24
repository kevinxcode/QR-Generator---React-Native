import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { CodeListItem } from '@/components/code/CodeListItem';
import { Button, ConfirmDialog, Screen, Skeleton, Text } from '@/components/ui';
import { getRepos } from '@/db/database';
import { safely } from '@/features/codes/actions';
import { copyText } from '@/features/scanner/scanActions';
import { useAsync } from '@/hooks/useAsync';
import { toCsv } from '@/services/export/csv';
import { shareFile } from '@/services/export/ExportService';
import { formatLabel } from '@/services/barcode/formats';
import { LocalFileService } from '@/services/files/LocalFileService';
import { notifyDataChanged } from '@/store/data.store';
import { spacing } from '@/theme/tokens';

export default function SessionDetail() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { data, loading } = useAsync(() => getRepos().sessions.items(id), [id]);
  const [confirm, setConfirm] = useState(false);

  const exportCsv = () =>
    safely(async () => {
      const rows = (data ?? []).map((c, i) => [i + 1, c.payload, formatLabel(c.format), c.contentType, new Date(c.createdAt).toISOString()]);
      const uri = await LocalFileService.writeText('exports', `session-${id.slice(0, 6)}.csv`, toCsv(['#', 'value', 'format', 'type', 'scanned_at'], rows));
      await shareFile(uri, 'csv', 'Export CSV');
    });

  return (
    <Screen
      title={name ?? 'Session'}
      subtitle={data ? `${data.length} codes` : undefined}
      back
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <Button title="Copy all" icon="copy-outline" variant="secondary" size="sm" flex disabled={!data?.length} onPress={() => copyText((data ?? []).map((c) => c.payload).join('\n'))} />
          <Button title="CSV" icon="document-text-outline" variant="secondary" size="sm" flex disabled={!data?.length} onPress={exportCsv} />
          <Button title="Delete" icon="trash-outline" variant="secondary" size="sm" flex onPress={() => setConfirm(true)} />
        </View>
      }
    >
      {loading && !data ? <Skeleton height={200} /> : (data ?? []).map((c) => <CodeListItem key={c.id} item={c} compact />)}
      {data?.length === 0 && <Text color="muted">The codes from this session were removed from history.</Text>}
      <ConfirmDialog
        visible={confirm}
        title="Delete session?"
        message="The session list is removed. Scanned codes stay in your history."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          setConfirm(false);
          await safely(() => getRepos().sessions.delete(id));
          notifyDataChanged();
          router.back();
        }}
      />
    </Screen>
  );
}
