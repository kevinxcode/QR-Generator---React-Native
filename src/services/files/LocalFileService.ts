import * as FS from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

import { uuid } from '@/utils/id';

export type AppFolder = 'logos' | 'exports' | 'thumbnails' | 'backups';

const ROOT = `${FS.documentDirectory ?? ''}app-data/`;

export const LocalFileService = {
  root: ROOT,

  dir(folder: AppFolder): string {
    return `${ROOT}${folder}/`;
  },

  async ensureDirs(): Promise<void> {
    for (const f of ['logos', 'exports', 'thumbnails', 'backups'] as AppFolder[]) {
      const path = this.dir(f);
      const info = await FS.getInfoAsync(path);
      if (!info.exists) await FS.makeDirectoryAsync(path, { intermediates: true });
    }
  },

  async exists(uri: string | null | undefined): Promise<boolean> {
    if (!uri) return false;
    try {
      return (await FS.getInfoAsync(uri)).exists;
    } catch {
      return false;
    }
  },

  /**
   * Copy a picked image into app storage as a normalised PNG (max 512px) so logos
   * survive gallery changes and stay small enough to embed.
   */
  async importLogo(sourceUri: string): Promise<string> {
    await this.ensureDirs();
    const ctx = ImageManipulator.ImageManipulator.manipulate(sourceUri);
    ctx.resize({ width: 512 });
    const rendered = await ctx.renderAsync();
    const saved = await rendered.saveAsync({ format: ImageManipulator.SaveFormat.PNG, compress: 1 });
    const dest = `${this.dir('logos')}${uuid()}.png`;
    await FS.copyAsync({ from: saved.uri, to: dest });
    return dest;
  },

  /** Returns a data: URI for an image file, or null if the file is missing. */
  async toDataUri(uri: string | null | undefined, mime = 'image/png'): Promise<string | null> {
    if (!uri) return null;
    if (uri.startsWith('data:')) return uri;
    try {
      if (!(await this.exists(uri))) return null;
      const b64 = await FS.readAsStringAsync(uri, { encoding: FS.EncodingType.Base64 });
      return `data:${mime};base64,${b64}`;
    } catch {
      return null;
    }
  },

  async writeText(folder: AppFolder, name: string, content: string): Promise<string> {
    await this.ensureDirs();
    const path = `${this.dir(folder)}${name}`;
    await FS.writeAsStringAsync(path, content, { encoding: FS.EncodingType.UTF8 });
    return path;
  },

  async writeBase64(folder: AppFolder, name: string, base64: string): Promise<string> {
    await this.ensureDirs();
    const path = `${this.dir(folder)}${name}`;
    await FS.writeAsStringAsync(path, base64, { encoding: FS.EncodingType.Base64 });
    return path;
  },

  async copyTo(folder: AppFolder, from: string, name: string): Promise<string> {
    await this.ensureDirs();
    const path = `${this.dir(folder)}${name}`;
    await FS.deleteAsync(path, { idempotent: true });
    await FS.copyAsync({ from, to: path });
    return path;
  },

  async readText(uri: string): Promise<string> {
    return FS.readAsStringAsync(uri, { encoding: FS.EncodingType.UTF8 });
  },

  async remove(uri: string | null | undefined): Promise<void> {
    if (!uri) return;
    try {
      await FS.deleteAsync(uri, { idempotent: true });
    } catch {
      // already gone
    }
  },

  /** Clear temporary export files (they are only needed while sharing). */
  async clearExports(): Promise<void> {
    await this.remove(this.dir('exports'));
    await this.ensureDirs();
  },

  /** Delete logos that are no longer referenced by any saved design. */
  async pruneLogos(referenced: string[]): Promise<number> {
    const keep = new Set(referenced);
    let removed = 0;
    try {
      const names = await FS.readDirectoryAsync(this.dir('logos'));
      for (const n of names) {
        const uri = `${this.dir('logos')}${n}`;
        if (!keep.has(uri)) {
          await this.remove(uri);
          removed++;
        }
      }
    } catch {
      // folder missing
    }
    return removed;
  },

  async usage(): Promise<number> {
    let total = 0;
    const walk = async (path: string) => {
      const info = await FS.getInfoAsync(path);
      if (!info.exists) return;
      if (info.isDirectory) {
        for (const n of await FS.readDirectoryAsync(path)) await walk(`${path.replace(/\/$/, '')}/${n}`);
      } else {
        total += info.size ?? 0;
      }
    };
    try {
      await walk(ROOT);
      const dbInfo = await FS.getInfoAsync(`${FS.documentDirectory}SQLite/qraft.db`);
      if (dbInfo.exists && !dbInfo.isDirectory) total += dbInfo.size ?? 0;
    } catch {
      // ignore
    }
    return total;
  },

  async wipeAll(): Promise<void> {
    await this.remove(ROOT);
    await this.ensureDirs();
  },
};
