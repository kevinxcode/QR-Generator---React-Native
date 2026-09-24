import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CodeListItem } from '@/components/code/CodeListItem';
import { Badge, ConfirmDialog, EmptyState, IconButton, SearchInput, SegmentedControl, Skeleton, Text } from '@/components/ui';
import type { CodeFilter } from '@/db/repositories/CodeRepository';
import { deleteCode, safely, toggleFavorite } from '@/features/codes/actions';
import { startQr } from '@/features/generator/startCreate';
import { FilterSheet } from '@/features/history/FilterSheet';
import { useHistoryQuery, type HistoryFilters } from '@/features/history/useHistoryQuery';
import { toast } from '@/store/toast.store';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import type { CodeRecord } from '@/types/domain';

const TABS: { value: CodeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'scanned', label: 'Scanned' },
  { value: 'created', label: 'Created' },
  { value: 'favorites', label: 'Favorites' },
];

const EMPTY: Record<CodeFilter, { title: string; message: string; cta: string; icon: 'scan-outline' | 'sparkles-outline' | 'star-outline' | 'time-outline' }> = {
  all: { title: 'Nothing here yet', message: 'Codes you scan or create are saved privately on this device.', cta: 'Scan your first code', icon: 'time-outline' },
  scanned: { title: 'No scans yet.', message: 'Point your camera at any QR code or barcode.', cta: 'Scan your first code', icon: 'scan-outline' },
  created: { title: 'No QR codes created yet.', message: 'Design a QR code for your website, Wi-Fi or contact card.', cta: 'Create a QR code', icon: 'sparkles-outline' },
  favorites: { title: 'No favorites yet.', message: 'Tap the star on any code to keep it here.', cta: 'Browse history', icon: 'star-outline' },
};

export default function History() {
  const p = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ filter?: CodeFilter; focus?: string }>();
  const searchRef = useRef<TextInput>(null);
  const [filters, setFilters] = useState<HistoryFilters>({ filter: params.filter ?? 'all', search: '', range: 'any', sort: 'newest' });
  const [sheet, setSheet] = useState(false);
  const [toDelete, setToDelete] = useState<CodeRecord | null>(null);
  const { items, loading, error, loadMore, done } = useHistoryQuery(filters);

  // Follow the `filter` route param (e.g. "See all" from Home) by adjusting state during render.
  const [lastParam, setLastParam] = useState(params.filter);
  if (params.filter !== lastParam) {
    setLastParam(params.filter);
    if (params.filter) setFilters((f) => ({ ...f, filter: params.filter! }));
  }
  useEffect(() => {
    if (params.focus) setTimeout(() => searchRef.current?.focus(), 300);
  }, [params.focus]);

  const activeFilters = (filters.range !== 'any' ? 1 : 0) + (filters.sort !== 'newest' ? 1 : 0);
  const empty = EMPTY[filters.filter];
  const searching = !!filters.search || filters.range !== 'any';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="title" style={{ flex: 1 }} accessibilityRole="header">
          History
        </Text>
        <IconButton icon="folder-open-outline" label="Collections" variant="filled" onPress={() => router.push('/collections')} />
        <View>
          <IconButton icon="options-outline" label={`Filter and sort${activeFilters ? `, ${activeFilters} active` : ''}`} variant="filled" onPress={() => setSheet(true)} />
          {activeFilters > 0 && (
            <View style={{ position: 'absolute', top: -2, right: -2 }}>
              <Badge label={String(activeFilters)} tone="primary" />
            </View>
          )}
        </View>
      </View>
      <View style={styles.controls}>
        <SearchInput ref={searchRef} value={filters.search} onChangeText={(search) => setFilters((f) => ({ ...f, search }))} placeholder="Search content, type, note, #tag" />
        <SegmentedControl options={TABS} value={filters.filter} onChange={(filter) => setFilters((f) => ({ ...f, filter }))} accessibilityLabel="History filter" />
      </View>

      {loading && items.length === 0 ? (
        <View style={{ padding: spacing.md, gap: spacing.xs }}>
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={64} />)}
        </View>
      ) : error ? (
        <EmptyState icon="alert-circle-outline" title="Couldn't load history" message={error} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 120, gap: spacing.xs }}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={12}
          windowSize={7}
          removeClippedSubviews
          renderItem={({ item }) => (
            <CodeListItem
              item={item}
              onToggleFavorite={(c) => safely(() => toggleFavorite(c))}
              onDelete={setToDelete}
            />
          )}
          ListFooterComponent={!done && items.length > 0 ? <ActivityIndicator style={{ margin: spacing.md }} color={p.primary} /> : null}
          ListEmptyComponent={
            searching ? (
              <EmptyState icon="search-outline" title="No matches" message="Try a different search or filter." />
            ) : (
              <EmptyState
                icon={empty.icon}
                title={empty.title}
                message={empty.message}
                cta={empty.cta}
                onCta={() => (filters.filter === 'created' ? startQr('url') : filters.filter === 'favorites' ? setFilters((f) => ({ ...f, filter: 'all' })) : router.navigate('/scan'))}
              />
            )
          }
        />
      )}

      <FilterSheet
        key={String(sheet)}
        visible={sheet}
        value={filters}
        onClose={() => setSheet(false)}
        onApply={(f) => {
          setFilters(f);
          setSheet(false);
        }}
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
          if (c && (await safely(() => deleteCode(c))) !== undefined) toast.success('Deleted');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, minHeight: 56 },
  controls: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: spacing.sm },
});
