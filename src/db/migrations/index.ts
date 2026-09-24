import type { Db } from '../types';

export interface Migration {
  version: number;
  name: string;
  up: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial schema',
    up: `
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_folders_name ON folders(name COLLATE NOCASE);

      CREATE TABLE IF NOT EXISTS codes (
        id TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('qr','barcode')),
        format TEXT NOT NULL,
        content_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        title TEXT,
        note TEXT,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
        source TEXT NOT NULL CHECK (source IN ('generated','scanned','imported')),
        form_data TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_codes_created ON codes(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_codes_source ON codes(source, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_codes_fav ON codes(is_favorite, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_codes_folder ON codes(folder_id);

      CREATE TABLE IF NOT EXISTS qr_designs (
        id TEXT PRIMARY KEY NOT NULL,
        code_id TEXT NOT NULL UNIQUE REFERENCES codes(id) ON DELETE CASCADE,
        body_style TEXT NOT NULL,
        eye_frame_style TEXT NOT NULL,
        eye_style TEXT NOT NULL,
        foreground_color TEXT NOT NULL,
        background_color TEXT NOT NULL,
        transparent_background INTEGER NOT NULL DEFAULT 0,
        gradient_type TEXT NOT NULL,
        gradient_start TEXT,
        gradient_end TEXT,
        gradient_angle REAL,
        eye_color TEXT,
        corner_color TEXT,
        error_correction TEXT NOT NULL,
        quiet_zone INTEGER NOT NULL,
        logo_uri TEXT,
        logo_size REAL,
        logo_padding REAL,
        logo_background TEXT,
        logo_rounded INTEGER NOT NULL DEFAULT 1,
        frame_type TEXT NOT NULL,
        frame_layout TEXT,
        frame_text TEXT,
        frame_color TEXT,
        frame_text_color TEXT,
        frame_font_size REAL
      );

      CREATE TABLE IF NOT EXISTS barcode_options (
        code_id TEXT PRIMARY KEY NOT NULL REFERENCES codes(id) ON DELETE CASCADE,
        options TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_name ON tags(name COLLATE NOCASE);

      CREATE TABLE IF NOT EXISTS code_tags (
        code_id TEXT NOT NULL REFERENCES codes(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (code_id, tag_id)
      );

      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        design TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scan_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scan_session_items (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL REFERENCES scan_sessions(id) ON DELETE CASCADE,
        code_id TEXT NOT NULL REFERENCES codes(id) ON DELETE CASCADE,
        scanned_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_session_items ON scan_session_items(session_id);
    `,
  },
];

export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

/** Apply pending migrations based on PRAGMA user_version. Idempotent. */
export async function migrate(db: Db): Promise<number> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let current = row?.user_version ?? 0;
  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(m.up);
      await db.execAsync(`PRAGMA user_version = ${m.version}`);
    });
    current = m.version;
  }
  return current;
}
