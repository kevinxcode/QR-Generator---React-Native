import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet, Button, Card, Chip, ConfirmDialog, EmptyState, IconButton, Input, PressableScale, Screen, SectionHeader, Text } from '@/components/ui';
import { getRepos } from '@/db/database';
import { safely } from '@/features/codes/actions';
import { useAsync } from '@/hooks/useAsync';
import { notifyDataChanged } from '@/store/data.store';
import { toast } from '@/store/toast.store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import type { Folder } from '@/types/domain';

const FOLDER_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  personal: 'person-outline', work: 'briefcase-outline', wifi: 'wifi-outline', inventory: 'cube-outline', products: 'pricetags-outline', events: 'calendar-outline',
};

export default function Collections() {
  const p = useTheme();
  const folders = useAsync(() => getRepos().folders.list(), []);
  const tags = useAsync(() => getRepos().tags.list(), []);
  const [editing, setEditing] = useState<Folder | 'new' | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();
  const [toDelete, setToDelete] = useState<Folder | null>(null);

  const openEditor = (f: Folder | 'new') => {
    setEditing(f);
    setName(f === 'new' ? '' : f.name);
    setError(undefined);
  };

  const submit = async () => {
    try {
      if (editing === 'new') await getRepos().folders.create(name);
      else if (editing) await getRepos().folders.rename(editing.id, name);
      notifyDataChanged();
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save folder');
    }
  };

  return (
    <Screen title="Collections" back right={<IconButton icon="add" label="New folder" variant="filled" onPress={() => openEditor('new')} />}>
      <SectionHeader title="Folders" />
      {folders.data && folders.data.length === 0 && <EmptyState icon="folder-open-outline" title="No folders yet" cta="Create folder" onCta={() => openEditor('new')} />}
      <View style={styles.grid}>
        {(folders.data ?? []).map((f) => (
          <PressableScale
            key={f.id}
            onPress={() => router.push({ pathname: '/collections/[id]', params: { id: f.id, kind: 'folder', name: f.name } })}
            onLongPress={() => openEditor(f)}
            accessibilityLabel={`${f.name}, ${f.count} codes`}
            accessibilityHint="Long press to rename or delete"
            style={[styles.folder, { backgroundColor: p.surface, borderColor: p.border }]}
          >
            <View style={[styles.icon, { backgroundColor: p.primarySoft }]}>
              <Ionicons name={FOLDER_ICONS[f.name.toLowerCase()] ?? 'folder-outline'} size={20} color={p.primary} />
            </View>
            <Text variant="bodyStrong" numberOfLines={1}>
              {f.name}
            </Text>
            <Text variant="caption" color="muted">
              {f.count} {f.count === 1 ? 'code' : 'codes'}
            </Text>
          </PressableScale>
        ))}
      </View>

      <SectionHeader title="Tags" />
      {tags.data && tags.data.length === 0 ? (
        <Card tone="alt">
          <Text variant="caption" color="muted">
            Add tags like #office or #inventory from any code’s detail page.
          </Text>
        </Card>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {(tags.data ?? []).map((t) => (
            <Chip key={t.id} label={`#${t.name} · ${t.count}`} onPress={() => router.push({ pathname: '/collections/[id]', params: { id: t.id, kind: 'tag', name: `#${t.name}` } })} />
          ))}
        </View>
      )}

      <BottomSheet visible={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New folder' : 'Edit folder'}>
        <Input label="Name" value={name} onChangeText={setName} error={error} autoFocus maxLength={40} />
        <Button title={editing === 'new' ? 'Create' : 'Save'} onPress={submit} disabled={!name.trim()} />
        {editing && editing !== 'new' && (
          <Button
            title="Delete folder"
            variant="ghost"
            icon="trash-outline"
            onPress={() => {
              setToDelete(editing);
              setEditing(null);
            }}
          />
        )}
      </BottomSheet>
      <ConfirmDialog
        visible={!!toDelete}
        title={`Delete “${toDelete?.name}”?`}
        message="Codes in this folder are kept and moved out of it."
        confirmLabel="Delete folder"
        destructive
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          const f = toDelete;
          setToDelete(null);
          if (f && (await safely(async () => { await getRepos().folders.delete(f.id); return true; }))) {
            notifyDataChanged();
            toast.success('Folder deleted');
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  folder: { flexBasis: '48%', flexGrow: 1, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, gap: 4 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
