import { getRepos } from '@/db/database';
import { LocalFileService } from '@/services/files/LocalFileService';
import { notifyDataChanged } from '@/store/data.store';
import { toast } from '@/store/toast.store';
import type { CodeRecord } from '@/types/domain';

/** Shared mutations used by lists and detail screens. Keeps SQL out of UI. */
export async function toggleFavorite(item: Pick<CodeRecord, 'id'>): Promise<boolean> {
  const fav = await getRepos().codes.toggleFavorite(item.id);
  notifyDataChanged();
  return fav;
}

export async function deleteCode(item: Pick<CodeRecord, 'id'>): Promise<true> {
  const { codes, designs, tags } = getRepos();
  const design = await designs.getQrDesign(item.id);
  await codes.delete(item.id);
  await tags.setForCode(item.id, []);
  if (design?.logoUri) {
    const still = await designs.listLogoUris();
    if (!still.includes(design.logoUri)) await LocalFileService.remove(design.logoUri);
  }
  notifyDataChanged();
  return true;
}

export async function safely<T>(fn: () => Promise<T>, errorMessage = 'Something went wrong.'): Promise<T | undefined> {
  try {
    return await fn();
  } catch (e) {
    toast.error(e instanceof Error && e.message ? e.message : errorMessage);
    return undefined;
  }
}
