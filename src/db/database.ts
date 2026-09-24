import * as SQLite from 'expo-sqlite';

import { migrate } from './migrations';
import { BackupRepository } from './repositories/BackupRepository';
import { CodeRepository } from './repositories/CodeRepository';
import { DesignRepository } from './repositories/DesignRepository';
import { FolderRepository } from './repositories/FolderRepository';
import { HistoryRepository } from './repositories/HistoryRepository';
import { ScanSessionRepository } from './repositories/ScanSessionRepository';
import { TagRepository } from './repositories/TagRepository';
import { TemplateRepository } from './repositories/TemplateRepository';
import type { Db } from './types';

export const DB_NAME = 'qraft.db';

export interface Repositories {
  codes: CodeRepository;
  designs: DesignRepository;
  folders: FolderRepository;
  tags: TagRepository;
  sessions: ScanSessionRepository;
  history: HistoryRepository;
  templates: TemplateRepository;
  backup: BackupRepository;
}

let repos: Repositories | null = null;
let opening: Promise<Repositories> | null = null;

function adapt(db: SQLite.SQLiteDatabase): Db {
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: async (sql, params = []) => {
      const r = await db.runAsync(sql, params);
      return { changes: r.changes, lastInsertRowId: r.lastInsertRowId };
    },
    getAllAsync: (sql, params = []) => db.getAllAsync(sql, params),
    getFirstAsync: (sql, params = []) => db.getFirstAsync(sql, params),
    withTransactionAsync: (fn) => db.withTransactionAsync(fn),
  };
}

/** Open the database, run migrations and seed default folders. Safe to call repeatedly. */
export function initDatabase(): Promise<Repositories> {
  if (repos) return Promise.resolve(repos);
  if (!opening) {
    opening = (async () => {
      const raw = await SQLite.openDatabaseAsync(DB_NAME);
      await raw.execAsync('PRAGMA journal_mode = WAL;');
      const db = adapt(raw);
      await migrate(db);
      const r: Repositories = {
        codes: new CodeRepository(db),
        designs: new DesignRepository(db),
        folders: new FolderRepository(db),
        tags: new TagRepository(db),
        sessions: new ScanSessionRepository(db),
        history: new HistoryRepository(db),
        templates: new TemplateRepository(db),
        backup: new BackupRepository(db),
      };
      await r.folders.seedDefaults();
      repos = r;
      return r;
    })().catch((e) => {
      opening = null;
      throw e;
    });
  }
  return opening;
}

export function getRepos(): Repositories {
  if (!repos) throw new Error('Database not initialised');
  return repos;
}
