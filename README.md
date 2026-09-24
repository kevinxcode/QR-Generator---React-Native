# Qraft — QR & Barcode Studio

Offline, privacy-first QR code and barcode scanner and designer built with Expo SDK 57, React Native 0.86 and TypeScript.

No account, no backend, no cloud: all data lives in SQLite on the device.

## Requirements

- Node 20+ (tested with Node 24)
- JDK 17 for Android builds (`JAVA_HOME` must point to it)
- Android SDK / emulator, or Xcode for iOS
- A **development build**. The camera scanner, SQLite and native SVG rasterising need native modules, so use `expo run:*` rather than Expo Go for full functionality.

## Commands

```bash
npm install
npm run android        # expo run:android — build & install the dev client
npm run ios            # expo run:ios
npm start              # start Metro for an installed dev client

npm run typecheck      # tsc --noEmit
npm run lint           # expo lint
npm test               # jest (unit + repository + rasterise/decode tests)
npm run doctor         # expo-doctor
```

## Architecture

```
src/app/            Expo Router routes (thin screens)
src/components/     ui/ (design system), qr/, barcode/, scanner/, code/, navigation/
src/features/       screen logic: scanner, generator (studio panels), history, codes, settings
src/services/       pure domain logic (no React Native imports where possible)
  qr/               payload builders, matrix, SVG renderer, templates, content types
  barcode/          format metadata, validators (GS1 checksums), bwip-js renderer
  scanner/          ScanResultParser, URL safety, capabilities, cooldown & batch dedupe
  scannability/     contrast + logo coverage + quiet zone scoring
  export/           PNG/SVG/PDF export, CSV, backup schema
  files/            LocalFileService (app-data/logos, exports, thumbnails, backups)
src/db/             expo-sqlite adapter, migrations (PRAGMA user_version), repositories
src/storage/        settings.repository.ts (the only AsyncStorage user)
src/store/          zustand stores (settings, generator draft, toast, data version)
src/theme/          tokens + light/dark/system ThemeProvider
```

Rendering pipeline: `qrcode` builds the module matrix, then `QRGeneratorService` produces one SVG string (styles, eyes, gradients, logo cut-out, frame). The same string feeds the on-screen preview (`SvgXml`), SVG export, PDF export (`expo-print`) and PNG export (native rasteriser at the exact pixel size).

## Known limitations

- **Gallery scanning on iOS decodes QR codes only.** This is an `expo-camera` / iOS limitation; Android also decodes barcodes from images.
- Apps cannot join Wi-Fi networks directly. Qraft copies the password and opens Wi-Fi settings.
- "Save contact" and "Add to calendar" hand a `.vcf` / `.ics` file to the system share sheet.
- Backups contain metadata and designs but not logo image files.
- Data Matrix, PDF417 and Aztec can be scanned but not generated.
