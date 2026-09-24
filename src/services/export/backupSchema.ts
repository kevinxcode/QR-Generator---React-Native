import { z } from 'zod';

export const BACKUP_APP = 'qraft';
export const BACKUP_VERSION = 1;

const str = z.string();
const nstr = z.string().nullable();
const num = z.number().finite();
const nnum = z.number().finite().nullable();

export const backupSchema = z.object({
  app: z.literal(BACKUP_APP),
  version: z.literal(BACKUP_VERSION),
  exportedAt: num,
  folders: z.array(z.object({ id: str, name: str.min(1), created_at: num })),
  tags: z.array(z.object({ id: str, name: str.min(1) })),
  codes: z.array(z.object({
    id: str,
    kind: z.enum(['qr', 'barcode']),
    format: str,
    content_type: str,
    payload: str,
    title: nstr,
    note: nstr,
    is_favorite: z.union([z.literal(0), z.literal(1)]),
    folder_id: nstr,
    source: z.enum(['generated', 'scanned', 'imported']),
    form_data: nstr,
    created_at: num,
    updated_at: num,
  })),
  code_tags: z.array(z.object({ code_id: str, tag_id: str })),
  qr_designs: z.array(z.object({
    id: str,
    code_id: str,
    body_style: str,
    eye_frame_style: str,
    eye_style: str,
    foreground_color: str,
    background_color: str,
    transparent_background: num,
    gradient_type: str,
    gradient_start: nstr,
    gradient_end: nstr,
    gradient_angle: nnum,
    eye_color: nstr,
    corner_color: nstr,
    error_correction: z.enum(['L', 'M', 'Q', 'H']),
    quiet_zone: num,
    logo_uri: nstr,
    logo_size: nnum,
    logo_padding: nnum,
    logo_background: nstr,
    logo_rounded: num,
    frame_type: str,
    frame_layout: nstr,
    frame_text: nstr,
    frame_color: nstr,
    frame_text_color: nstr,
    frame_font_size: nnum,
  })),
  barcode_options: z.array(z.object({ code_id: str, options: str })),
  templates: z.array(z.object({ id: str, name: str, design: str, created_at: num })),
  scan_sessions: z.array(z.object({ id: str, name: str, created_at: num })),
  scan_session_items: z.array(z.object({ id: str, session_id: str, code_id: str, scanned_at: num })),
});

export type Backup = z.infer<typeof backupSchema>;

export type BackupParseResult = { ok: true; backup: Backup } | { ok: false; error: string };

export function parseBackup(text: string): BackupParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' };
  }
  if (typeof json !== 'object' || json === null || (json as { app?: unknown }).app !== BACKUP_APP) {
    return { ok: false, error: 'This file is not a Qraft backup.' };
  }
  if ((json as { version?: unknown }).version !== BACKUP_VERSION) {
    return { ok: false, error: 'This backup was made by an unsupported version of Qraft.' };
  }
  const r = backupSchema.safeParse(json);
  if (!r.success) {
    const issue = r.error.issues[0];
    return { ok: false, error: `Backup is damaged (${issue.path.join('.')}: ${issue.message}).` };
  }
  return { ok: true, backup: r.data };
}
