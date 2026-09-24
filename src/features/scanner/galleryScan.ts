import { scanFromURLAsync } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { normalizeScannedType } from '@/services/scanner/capabilities';
import { toast } from '@/store/toast.store';

export interface DetectedCode {
  data: string;
  format: string;
}

/**
 * Pick an image from the gallery and decode codes from it, fully on-device.
 * Uses the system photo picker, which needs no broad library permission on modern OS versions.
 */
export async function scanFromGallery(): Promise<void> {
  let picked: ImagePicker.ImagePickerResult;
  try {
    picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: false });
  } catch {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error('Photo access is needed to scan a code from an image. You can enable it in Settings.');
      return;
    }
    picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  }
  if (picked.canceled || !picked.assets[0]) return;
  const uri = picked.assets[0].uri;

  let results: { data: string; type: string }[] = [];
  try {
    results = await scanFromURLAsync(uri);
  } catch {
    results = [];
  }
  const seen = new Set<string>();
  const found: DetectedCode[] = [];
  for (const r of results) {
    const format = normalizeScannedType(r.type);
    const key = `${format}:${r.data}`;
    if (!r.data || seen.has(key)) continue;
    seen.add(key);
    found.push({ data: r.data, format });
  }

  if (found.length === 0) {
    toast.error(
      Platform.OS === 'ios'
        ? 'No QR code found in this image. (Barcodes in photos can only be read on Android.)'
        : 'No code found. Try a sharper image where the code fills more of the frame.',
    );
    return;
  }
  if (found.length === 1) {
    router.push({ pathname: '/scan/result', params: { data: found[0].data, format: found[0].format, from: 'gallery' } });
    return;
  }
  router.push({ pathname: '/scan/gallery', params: { results: JSON.stringify(found), uri } });
}
