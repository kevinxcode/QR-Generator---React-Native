import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, ConfirmDialog, Divider, ListRow, Screen, SectionHeader, Skeleton, Text } from '@/components/ui';
import { getRepos } from '@/db/database';
import { safely } from '@/features/codes/actions';
import { clearCreatedHistory, clearScanHistory, deleteAllData, exportBackup, importBackup } from '@/features/settings/dataActions';
import { useAsync } from '@/hooks/useAsync';
import { LocalFileService } from '@/services/files/LocalFileService';
import { toast } from '@/store/toast.store';
import { spacing } from '@/theme/tokens';
import { bytes } from '@/utils/format';

type Pending = null | 'scans' | 'created' | 'all' | 'replace';

export default function StorageScreen() {
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { data, loading } = useAsync(async () => {
    const [stats, sessions, size] = await Promise.all([getRepos().codes.stats(), getRepos().sessions.count(), LocalFileService.usage()]);
    return { stats, sessions, size };
  });

  const doImport = async (mode: 'merge' | 'replace') => {
    setBusy('import');
    const r = await safely(() => importBackup(mode), 'Import failed.');
    setBusy(null);
    if (!r) return;
    if (r.ok) toast.success(`Restored ${r.summary.codes} codes, ${r.summary.folders} folders, ${r.summary.tags} tags`);
    else if (!('canceled' in r)) toast.error(r.error);
  };

  const confirm = async () => {
    const what = pending;
    setPending(null);
    if (what === 'replace') return doImport('replace');
    setBusy(what);
    if (what === 'scans') {
      const n = await safely(clearScanHistory);
      if (n !== undefined) toast.success(`Removed ${n} scans`);
    } else if (what === 'created') {
      const n = await safely(clearCreatedHistory);
      if (n !== undefined) toast.success(`Removed ${n} created codes`);
    } else if (what === 'all') {
      if ((await safely(async () => { await deleteAllData(); return true; })) === true) toast.success('All local data deleted');
    }
    setBusy(null);
  };

  const s = data?.stats;
  return (
    <Screen title="Storage & backup" back>
      <SectionHeader title="On this device" />
      {loading && !data ? (
        <Skeleton height={180} />
      ) : (
        <Card style={{ gap: spacing.xs }}>
          <Stat label="Total records" value={s?.total ?? 0} />
          <Stat label="Generated codes" value={s?.created ?? 0} />
          <Stat label="Scanned codes" value={s?.scanned ?? 0} />
          <Stat label="Favorites" value={s?.favorites ?? 0} />
          <Stat label="Batch sessions" value={data?.sessions ?? 0} />
          <Stat label="Storage used" value={bytes(data?.size ?? 0)} />
        </Card>
      )}

      <SectionHeader title="Backup" />
      <Card style={{ gap: spacing.sm }}>
        <Text variant="caption" color="muted">
          Backups are JSON files with your history, designs, folders and tags. Logo images are not included. You choose where to save them.
        </Text>
        <Button title="Export backup" icon="cloud-download-outline" onPress={async () => { setBusy('export'); await safely(exportBackup, 'Could not create backup.'); setBusy(null); }} loading={busy === 'export'} />
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <Button title="Import (merge)" icon="git-merge-outline" variant="secondary" flex onPress={() => doImport('merge')} loading={busy === 'import'} />
          <Button title="Import (replace)" icon="swap-horizontal-outline" variant="secondary" flex onPress={() => setPending('replace')} />
        </View>
      </Card>

      <SectionHeader title="Clean up" />
      <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
        <ListRow icon="scan-outline" title="Clear scan history" destructive onPress={() => setPending('scans')} />
        <Divider />
        <ListRow icon="sparkles-outline" title="Clear created codes" destructive onPress={() => setPending('created')} />
        <Divider />
        <ListRow icon="nuclear-outline" title="Delete all local data" subtitle="History, designs, logos, folders, tags and settings" destructive onPress={() => setPending('all')} />
      </Card>

      <ConfirmDialog
        visible={!!pending}
        loading={!!busy}
        destructive
        title={pending === 'all' ? 'Delete everything?' : pending === 'replace' ? 'Replace all data?' : pending === 'scans' ? 'Clear scan history?' : 'Clear created codes?'}
        message={
          pending === 'all'
            ? 'This permanently removes all Qraft data from this device. It cannot be undone.'
            : pending === 'replace'
              ? 'Your current history will be deleted and replaced with the backup contents.'
              : 'This cannot be undone. Favorites in this list will also be removed.'
        }
        confirmLabel={pending === 'replace' ? 'Choose backup' : 'Delete'}
        onCancel={() => setPending(null)}
        onConfirm={confirm}
      />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text color="muted">{label}</Text>
      <Text variant="bodyStrong">{value}</Text>
    </View>
  );
}
