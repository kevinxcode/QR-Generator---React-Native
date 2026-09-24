import { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet, Button, Chip, Input, SectionHeader, Text } from '@/components/ui';
import type { CodeSort } from '@/db/repositories/CodeRepository';
import { spacing } from '@/theme/tokens';

import type { DateRange, HistoryFilters } from './useHistoryQuery';

const RANGES: { value: DateRange; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'custom', label: 'Custom' },
];

const SORTS: { value: CodeSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'type', label: 'Type' },
];

function parseDay(v: string, endOfDay: boolean): number | undefined | null {
  if (!v.trim()) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

const fmt = (ts?: number) => {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface Props {
  visible: boolean;
  value: HistoryFilters;
  onClose(): void;
  onApply(f: HistoryFilters): void;
}

export function FilterSheet({ visible, value, onClose, onApply }: Props) {
  const [range, setRange] = useState<DateRange>(value.range);
  const [sort, setSort] = useState<CodeSort>(value.sort);
  const [from, setFrom] = useState(fmt(value.customFrom));
  const [to, setTo] = useState(fmt(value.customTo));
  const [error, setError] = useState<string>();

  const apply = () => {
    let customFrom: number | undefined;
    let customTo: number | undefined;
    if (range === 'custom') {
      const f = parseDay(from, false);
      const t = parseDay(to, true);
      if (f === null || t === null) return setError('Use the format YYYY-MM-DD.');
      if (f && t && f > t) return setError('Start date must be before end date.');
      customFrom = f;
      customTo = t;
    }
    setError(undefined);
    onApply({ ...value, range, sort, customFrom, customTo });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Filter & sort">
      <SectionHeader title="Date" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {RANGES.map((r) => (
          <Chip key={r.value} label={r.label} selected={range === r.value} onPress={() => setRange(r.value)} />
        ))}
      </View>
      {range === 'custom' && (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Input label="From" placeholder="2026-01-01" value={from} onChangeText={setFrom} keyboardType="numbers-and-punctuation" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="To" placeholder="2026-12-31" value={to} onChangeText={setTo} keyboardType="numbers-and-punctuation" />
          </View>
        </View>
      )}
      {error && <Text color="danger" variant="caption">{error}</Text>}
      <SectionHeader title="Sort" />
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        {SORTS.map((s) => (
          <Chip key={s.value} label={s.label} selected={sort === s.value} onPress={() => setSort(s.value)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button title="Reset" variant="secondary" flex onPress={() => onApply({ ...value, range: 'any', sort: 'newest', customFrom: undefined, customTo: undefined })} />
        <Button title="Apply" flex onPress={apply} />
      </View>
    </BottomSheet>
  );
}
