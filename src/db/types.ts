/**
 * Minimal async database interface. Implemented by expo-sqlite's SQLiteDatabase in the app
 * and by a node:sqlite adapter in tests, so repositories stay platform-agnostic.
 */
export type SQLValue = string | number | null;

export interface RunResult {
  changes: number;
  lastInsertRowId: number;
}

export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: SQLValue[]): Promise<RunResult>;
  getAllAsync<T>(sql: string, params?: SQLValue[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: SQLValue[]): Promise<T | null>;
  withTransactionAsync(fn: () => Promise<void>): Promise<void>;
}
