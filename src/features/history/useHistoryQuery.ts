import { useCallback, useEffect, useRef, useState } from 'react';

import { getRepos } from '@/db/database';
import type { CodeFilter, CodeQuery, CodeSort } from '@/db/repositories/CodeRepository';
import { useDataVersion } from '@/store/data.store';
import type { CodeRecord } from '@/types/domain';

export type DateRange = 'any' | 'today' | '7d' | '30d' | 'custom';

export interface HistoryFilters {
  filter: CodeFilter;
  search: string;
  range: DateRange;
  customFrom?: number;
  customTo?: number;
  sort: CodeSort;
  folderId?: string;
  tagId?: string;
}

const PAGE = 30;

export function rangeBounds(f: HistoryFilters, now = Date.now()): Pick<CodeQuery, 'from' | 'to'> {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  switch (f.range) {
    case 'today':
      return { from: startOfToday.getTime() };
    case '7d':
      return { from: startOfToday.getTime() - 6 * 86_400_000 };
    case '30d':
      return { from: startOfToday.getTime() - 29 * 86_400_000 };
    case 'custom':
      return { from: f.customFrom, to: f.customTo };
    default:
      return {};
  }
}

/** Paginated, debounced history query that refreshes on any data change. */
export function useHistoryQuery(f: HistoryFilters) {
  const version = useDataVersion((s) => s.version);
  const [items, setItems] = useState<CodeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const loadingMore = useRef(false);

  const query = useCallback(
    (offset: number): CodeQuery => ({
      filter: f.filter,
      search: f.search,
      sort: f.sort,
      folderId: f.folderId,
      tagId: f.tagId,
      ...rangeBounds(f),
      limit: PAGE,
      offset,
    }),
    [f],
  );

  useEffect(() => {
    const id = ++seq.current;
    const t = setTimeout(async () => {
      try {
        // Reload everything currently shown so mutations don't reset scroll position.
        const size = Math.max(PAGE, items.length);
        const rows = await getRepos().codes.list({ ...query(0), limit: size });
        if (id !== seq.current) return;
        setItems(rows);
        setDone(rows.length < size);
        setError(null);
      } catch (e) {
        if (id === seq.current) setError(e instanceof Error ? e.message : 'Could not load history');
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, f.search ? 220 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, version]);

  const loadMore = useCallback(async () => {
    if (done || loadingMore.current || loading) return;
    loadingMore.current = true;
    try {
      const rows = await getRepos().codes.list(query(items.length));
      setItems((prev) => [...prev, ...rows.filter((r) => !prev.some((x) => x.id === r.id))]);
      if (rows.length < PAGE) setDone(true);
    } finally {
      loadingMore.current = false;
    }
  }, [done, loading, query, items.length]);

  return { items, loading, error, loadMore, done };
}
