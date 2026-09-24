import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { CodeListItem } from '@/components/code/CodeListItem';
import { ConfirmDialog, EmptyState, Screen, SearchInput } from '@/components/ui';
import { deleteCode, safely, toggleFavorite } from '@/features/codes/actions';
import { useHistoryQuery, type HistoryFilters } from '@/features/history/useHistoryQuery';
import { spacing } from '@/theme/tokens';
import type { CodeRecord } from '@/types/domain';

/** Codes inside a folder or carrying a tag. */
export default function CollectionDetail() {
  const { id, kind, name } = useLocalSearchParams<{ id: string; kind: 'folder' | 'tag'; name?: string }>();
  const [search, setSearch] = useState('');
  const [toDelete, setToDelete] = useState<CodeRecord | null>(null);
  const filters = useMemo<HistoryFilters>(
    () => ({ filter: 'all', search, range: 'any', sort: 'newest', folderId: kind === 'folder' ? id : undefined, tagId: kind === 'tag' ? id : undefined }),
    [id, kind, search],
  );
  const { items, loading, loadMore, done } = useHistoryQuery(filters);

  return (
    <Screen title={name ?? 'Collection'} subtitle={kind === 'tag' ? 'Tag' : 'Folder'} back scroll={false}>
      <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
        <SearchInput value={search} onChangeText={setSearch} placeholder={`Search in ${name ?? 'collection'}`} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.xs, paddingBottom: spacing.xxl }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => <CodeListItem item={item} onToggleFavorite={(c) => safely(() => toggleFavorite(c))} onDelete={setToDelete} />}
        ListFooterComponent={loading || (!done && items.length) ? <ActivityIndicator style={{ margin: spacing.md }} /> : null}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon={kind === 'tag' ? 'pricetag-outline' : 'folder-open-outline'}
              title={search ? 'No matches' : 'Nothing here yet'}
              message={kind === 'tag' ? 'Add this tag from a code’s detail page.' : 'Move codes here from their detail page.'}
            />
          )
        }
      />
      <ConfirmDialog
        visible={!!toDelete}
        title="Delete this code?"
        message="It will be permanently removed from this device."
        confirmLabel="Delete"
        destructive
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          const c = toDelete;
          setToDelete(null);
          if (c) await safely(() => deleteCode(c));
        }}
      />
    </Screen>
  );
}
