import { getRepos } from '@/db/database';
import { LocalFileService } from '@/services/files/LocalFileService';
import { buildPayload, type ValidationResult } from '@/services/qr/payload';
import { notifyDataChanged } from '@/store/data.store';
import type { QRContentType, QRDesign } from '@/types/domain';
import { codeSummary } from '@/utils/format';

export function validateDraft(type: QRContentType, values: Record<string, unknown>): ValidationResult {
  return buildPayload(type, values);
}

/** Create or update a generated QR code together with its design. Returns the code id. */
export async function saveQr(input: { editingId: string | null; type: QRContentType; values: Record<string, unknown>; design: QRDesign; payload: string }): Promise<string> {
  const { codes, designs } = getRepos();
  const formData = JSON.stringify(input.values);
  const title = codeSummary({ payload: input.payload, contentType: input.type, title: null }).slice(0, 80);
  let id = input.editingId;
  let previousLogo: string | null = null;

  if (id && (await codes.get(id))) {
    previousLogo = (await designs.getQrDesign(id))?.logoUri ?? null;
    await codes.update(id, { payload: input.payload, contentType: input.type, formData, title });
  } else {
    const created = await codes.create({ kind: 'qr', format: 'qr', contentType: input.type, payload: input.payload, source: 'generated', formData, title });
    id = created.id;
  }
  await designs.saveQrDesign(id, input.design);

  if (previousLogo && previousLogo !== input.design.logoUri) {
    const inUse = await designs.listLogoUris();
    if (!inUse.includes(previousLogo)) await LocalFileService.remove(previousLogo);
  }
  notifyDataChanged();
  return id;
}
