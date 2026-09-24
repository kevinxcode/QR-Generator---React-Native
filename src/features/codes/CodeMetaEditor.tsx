import { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet, Button, Chip, Input, ListRow, SectionHeader, Text } from '@/components/ui';
import { getRepos } from '@/db/database';
import { useAsync } from '@/hooks/useAsync';
import { notifyDataChanged } from '@/store/data.store';
import { toast } from '@/store/toast.store';
import { spacing } from '@/theme/tokens';
import type { CodeRecord } from '@/types/domain';

import { safely } from './actions';

/** Notes, tags and folder assignment for a code. */
export function CodeMetaEditor({ code }: { code: CodeRecord }) {
  const [note, setNote] = useState(code.note ?? '');
  const [tagDraft, setTagDraft] = useState('');
  const [folderOpen, setFolderOpen] = useState(false);
  const [newFolder, setNewFolder] = useState('');
  const tags = useAsync(() => getRepos().tags.forCode(code.id), [code.id]);
  const allTags = useAsync(() => getRepos().tags.list(), []);
  const folders = useAsync(() => getRepos().folders.list(), []);
  const folder = folders.data?.find((f) => f.id === code.folderId);

  const saveNote = async () => {
    if ((code.note ?? '') === note) return;
    await safely(() => getRepos().codes.update(code.id, { note: note.trim() || null }));
    notifyDataChanged();
  };

  const setTags = async (names: string[]) => {
    await safely(() => getRepos().tags.setForCode(code.id, names));
    notifyDataChanged();
  };

  const addTag = async () => {
    const t = tagDraft.trim();
    if (!t) return;
    setTagDraft('');
    await setTags([...(tags.data ?? []).map((x) => x.name), ...t.split(/[\s,]+/)]);
  };

  const moveTo = async (folderId: string | null) => {
    await safely(() => getRepos().codes.update(code.id, { folderId }));
    notifyDataChanged();
    setFolderOpen(false);
  };

  const createFolder = async () => {
    const f = await safely(() => getRepos().folders.create(newFolder));
    if (f) {
      setNewFolder('');
      await moveTo(f.id);
      toast.success(`Moved to ${f.name}`);
    }
  };

  const current = tags.data ?? [];
  const suggestions = (allTags.data ?? []).filter((t) => !current.some((c) => c.id === t.id)).slice(0, 8);

  return (
    <View style={{ gap: spacing.sm }}>
      <SectionHeader title="Notes" />
      <Input value={note} onChangeText={setNote} onBlur={saveNote} placeholder="Add a note…" multiline accessibilityLabel="Notes" />

      <SectionHeader title="Tags" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {current.map((t) => (
          <Chip key={t.id} label={`#${t.name}`} selected onRemove={() => setTags(current.filter((x) => x.id !== t.id).map((x) => x.name))} />
        ))}
        {current.length === 0 && (
          <Text variant="caption" color="faint">
            No tags yet
          </Text>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Input value={tagDraft} onChangeText={setTagDraft} placeholder="#office, #wifi…" autoCapitalize="none" onSubmitEditing={addTag} returnKeyType="done" accessibilityLabel="Add tag" />
        </View>
        <Button title="Add" onPress={addTag} disabled={!tagDraft.trim()} />
      </View>
      {suggestions.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {suggestions.map((t) => (
            <Chip key={t.id} label={`#${t.name}`} icon="add" onPress={() => setTags([...current.map((x) => x.name), t.name])} />
          ))}
        </View>
      )}

      <SectionHeader title="Collection" />
      <ListRow icon="folder-outline" title={folder?.name ?? 'Not in a folder'} subtitle="Tap to change" onPress={() => setFolderOpen(true)} chevron />

      <BottomSheet visible={folderOpen} onClose={() => setFolderOpen(false)} title="Move to folder">
        <ListRow icon="remove-circle-outline" title="No folder" onPress={() => moveTo(null)} right={!code.folderId ? <Text color="primary">✓</Text> : undefined} />
        {(folders.data ?? []).map((f) => (
          <ListRow key={f.id} icon="folder-outline" title={f.name} subtitle={`${f.count ?? 0} codes`} onPress={() => moveTo(f.id)} right={f.id === code.folderId ? <Text color="primary">✓</Text> : undefined} />
        ))}
        <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Input value={newFolder} onChangeText={setNewFolder} placeholder="New folder name" accessibilityLabel="New folder name" />
          </View>
          <Button title="Create" onPress={createFolder} disabled={!newFolder.trim()} />
        </View>
      </BottomSheet>
    </View>
  );
}
