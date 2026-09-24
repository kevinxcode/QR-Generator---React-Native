import type { CodeFormat } from '@/types/domain';

/**
 * Suppresses repeated detections of the same code while it stays in view.
 * Camera callbacks fire many times per second; a value is accepted again only after
 * `cooldownMs` has passed since it was last *seen*.
 */
export class ScanCooldown {
  private lastSeen = new Map<string, number>();
  private lastAccepted = -Infinity;

  constructor(private cooldownMs = 2000, private minGapMs = 350) {}

  accept(value: string, now = Date.now()): boolean {
    const prev = this.lastSeen.get(value);
    this.lastSeen.set(value, now);
    if (prev !== undefined && now - prev < this.cooldownMs) return false;
    if (now - this.lastAccepted < this.minGapMs) return false;
    this.lastAccepted = now;
    return true;
  }

  reset(): void {
    this.lastSeen.clear();
    this.lastAccepted = -Infinity;
  }
}

export interface BatchItem {
  key: string;
  value: string;
  format: CodeFormat;
  scannedAt: number;
  count: number;
}

export interface BatchStats {
  total: number;
  unique: number;
  duplicates: number;
}

export type BatchAddResult = 'added' | 'duplicate' | 'ignored';

/** Pure batch-session state. Duplicates are counted but not appended unless allowed. */
export class BatchSession {
  items: BatchItem[] = [];
  private total = 0;

  constructor(private allowDuplicates = false) {}

  static keyOf(value: string, format: CodeFormat) {
    return `${format}:${value}`;
  }

  add(value: string, format: CodeFormat, now = Date.now()): BatchAddResult {
    if (!value) return 'ignored';
    const key = BatchSession.keyOf(value, format);
    this.total++;
    const existing = this.items.find((i) => i.key === key);
    if (existing) {
      existing.count++;
      if (!this.allowDuplicates) return 'duplicate';
      this.items.push({ key: `${key}#${this.total}`, value, format, scannedAt: now, count: 1 });
      return 'duplicate';
    }
    this.items.push({ key, value, format, scannedAt: now, count: 1 });
    return 'added';
  }

  remove(key: string): void {
    const item = this.items.find((i) => i.key === key);
    if (!item) return;
    this.total -= item.count;
    this.items = this.items.filter((i) => i.key !== key);
  }

  stats(): BatchStats {
    const unique = new Set(this.items.map((i) => BatchSession.keyOf(i.value, i.format))).size;
    return { total: this.total, unique, duplicates: this.total - unique };
  }

  clear(): void {
    this.items = [];
    this.total = 0;
  }
}
