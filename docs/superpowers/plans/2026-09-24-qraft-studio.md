# Qraft — QR & Barcode Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-screen JS QR demo with Qraft, an offline, privacy-first QR + barcode studio (scanner, designer, barcode generator, history, collections, batch/gallery scan, export, backup) on Expo SDK 57.

**Architecture:** Expo Router (file routes in `src/app`) → feature screens (`src/features/*`) → pure domain services (`src/services/*`, fully unit-tested, no RN imports) → repositories (`src/db/repositories/*`, the only SQL) over `expo-sqlite` with versioned migrations. Preferences live in AsyncStorage behind `settings.repository.ts` and a zustand store. QR rendering = `qrcode` matrix → custom SVG renderer (module/eye styles, gradients, logo, frames).

**Tech Stack:** Expo SDK 57, React Native 0.87, TypeScript, Expo Router, expo-camera, expo-image-picker, expo-image-manipulator, expo-media-library, expo-file-system, expo-sharing, expo-clipboard, expo-sqlite, expo-print, expo-haptics, AsyncStorage, react-native-svg, react-native-view-shot, reanimated, gesture-handler, zustand, zod, qrcode, bwip-js, jest-expo.

**Spec:** the product brief pasted in the conversation of 2026-09-24 (sections 1–53), plus the rename to "Qraft — QR & Barcode Studio".

## Global Constraints

- Expo SDK 57 (`expo@~57.0.25`); all native modules installed via `npx expo install`.
- No backend, no network calls for core features, no analytics.
- SQLite for all datasets; AsyncStorage only for preferences, only via `src/storage/settings.repository.ts`.
- No base64 blobs in SQLite; files under `documentDirectory/app-data/{logos,exports,thumbnails,backups}`.
- UI never runs SQL; screens target < ~300 lines.
- Never auto-open scanned URLs; "Auto-open result" defaults OFF.
- Suspicious URL wording: "Potentially unusual link" — never "malware".
- Keep `slug: qr-code-generator`, android package `com.kevinalnizar.iclick.qr`, EAS projectId.
- Display name: "Qraft"; full title "Qraft — QR & Barcode Studio".

## Review Focus

1. EAN-13/EAN-8/UPC-A input with wrong check digit or letters → rejected with a precise message; input without check digit → digit appended.
2. Unicode/emoji QR payloads → encoded as UTF-8 bytes and round-trip (qrcode byte mode).
3. WiFi SSID/password containing `;`, `,`, `:`, `\`, `"` → escaped in payload and unescaped by parser.
4. Scanner firing the same code repeatedly at 30fps → one result per cooldown window; batch counts duplicates without inserting.
5. Restoring a malformed or foreign JSON backup → rejected by zod before any DB write; valid backup restored in one transaction.

---

## File Structure

```
src/app/                      expo-router routes (thin wrappers)
  _layout.tsx                 providers, db init, theme, onboarding gate
  (tabs)/_layout.tsx          custom tab bar with center Scan FAB
  (tabs)/index.tsx | scan.tsx | create.tsx | history.tsx | settings.tsx
  onboarding.tsx, create/qr.tsx, create/barcode.tsx, code/[id].tsx,
  scan/result.tsx, scan/batch.tsx, scan/gallery.tsx,
  settings/privacy.tsx, settings/storage.tsx, settings/about.tsx,
  collections/index.tsx, collections/[id].tsx
src/theme/                    tokens.ts, palettes.ts, ThemeProvider.tsx
src/components/ui/            Button, IconButton, Card, Input, SearchInput, BottomSheet,
                              Chip, Badge, SegmentedControl, Modal, Toast, EmptyState,
                              Skeleton, SectionHeader, Screen, Text, Switch, ListRow, ColorSwatch
src/components/qr/            QRCodeView.tsx (SVG renderer), QRFrame.tsx
src/components/barcode/       BarcodeView.tsx
src/components/scanner/       ScannerOverlay.tsx, ScanLine.tsx
src/features/**               screen bodies + feature components
src/services/qr/              payload.ts, matrix.ts, shapes.ts, templates.ts, presets.ts, QRGeneratorService.ts
src/services/barcode/         formats.ts, validators.ts, BarcodeGeneratorService.ts
src/services/scanner/         ScanResultParser.ts, urlSafety.ts, capabilities.ts, dedupe.ts
src/services/scannability/    ScannabilityService.ts, color.ts
src/services/export/          ExportService.ts, csv.ts, backup.ts
src/services/files/           LocalFileService.ts
src/db/                       database.ts, migrations/index.ts, repositories/*.ts, types.ts
src/storage/                  settings.repository.ts
src/store/                    settings.store.ts, generator.store.ts, toast.store.ts
src/types/                    domain.ts
src/utils/                    date.ts, id.ts, strings.ts
__tests__/                    mirrors src/services and src/db
```

## Phase 1 — Foundation

### Task 1: SDK 57 + TypeScript + Router scaffold
- [ ] Remove `App.js`, `react-native-qrcode-svg`; set `expo@~57.0.25`; `npx expo install` all native deps; add `tsconfig.json` (strict, `@/*` → `src/*`), `babel.config.js`, ESLint (`eslint-config-expo`), jest-expo config.
- [ ] Update `app.json`: name "Qraft", scheme `qraft`, `main: expo-router/entry`, `userInterfaceStyle: automatic`, plugins (router, camera, image-picker, media-library, sqlite) with permission strings.
- [ ] Untrack `key/` and add to `.gitignore`.
- [ ] Verify: `npx tsc --noEmit`, `npx expo-doctor`. Commit.

### Task 2: Design system
- [ ] `tokens.ts` (spacing 4–40, radii 12/16/20, typography Display→Label), light/dark palettes, `ThemeProvider` (light/dark/system) and all UI primitives listed above with a11y labels and 44pt min targets. Commit.

### Task 3: SQLite + migrations + repositories
- [ ] Migration v1 = schema from spec §25 (+ `templates`, indices on `created_at`, `source`, `is_favorite`).
- [ ] `CodeRepository` (insert/update/delete/get/search/paginate/filters/favorite/stats), `HistoryRepository` (clear by source), `FolderRepository`, `TagRepository`, `ScanSessionRepository`, `DesignRepository`.
- [ ] Tests run repositories against a `better-sqlite3`-backed adapter implementing the same `Db` interface (`runAsync/getAllAsync/getFirstAsync/execAsync/withTransactionAsync`). Commit.

### Task 4: Settings repository + store
- [ ] zod-validated `Settings` with defaults; zustand store hydrated on boot. Test defaults + corrupt JSON fallback. Commit.

### Task 5: Navigation + onboarding + home
- [ ] Tabs with center FAB, onboarding (3 screens, Skip/Continue/Get Started), home dashboard (hero, quick actions, templates, stats, recent). Commit.

## Phase 2 — Scanner, parser, history
### Task 6: ScanResultParser + urlSafety (TDD)
Tests: URL (http/https/IP/punycode/long), WIFI escape round-trip, MAILTO/MATMSG, TEL, SMSTO/sms:, BEGIN:VCARD, geo:, BEGIN:VEVENT, plain text, barcode formats. Returns `{type, rawValue, format, metadata, actions}`.
### Task 7: Scanner screen (capabilities, cooldown dedupe, torch, facing, sound/vibration, permission states) + result screen with smart action card + URL safety sheet.
### Task 8: History list (tabs All/Scanned/Created/Favorites, search, date filters, sort, pagination, swipe favorite/delete) + detail screen (notes, tags, folder, actions, Edit Design).

## Phase 3/4 — QR generator + Design Studio
### Task 9: Payload builders (TDD) for all 17 content types + zod forms.
### Task 10: Matrix + SVG renderer: 8 body styles, 6 eye frames, 4 eyeballs, solid/linear/radial gradients, logo cutout, frames (6 layouts), quiet zone, transparency.
### Task 11: ScannabilityService (TDD): WCAG contrast, logo coverage vs ECC capacity, quiet zone, ECC → score/level/warnings/recommendations; auto-bump ECC to H with logo.
### Task 12: Studio screen: step flow (Type → Content → Customize → Preview → Save/Export), tabs CONTENT/STYLE/COLOR/LOGO/FRAME/ADVANCED, sticky preview, presets & templates, logo pick/crop/resize.

## Phase 5 — Barcode
### Task 13: validators (TDD: EAN-13/8, UPC-A/E checksum+expansion, Code39 charset, Code93, Code128 ASCII, ITF even-length digits, Codabar start/stop) + bwip-js SVG renderer + form/customization.

## Phase 6 — Favorites / folders / tags
### Task 14: Collections screens, folder CRUD, tag editor, assignment in detail.

## Phase 7 — Batch + gallery
### Task 15: `BatchSession` dedupe (TDD), batch screen with counters, remove, copy all, CSV export, save session. Gallery scan via `scanFromURLAsync` with multi-result picker.

## Phase 8 — Export / share / backup
### Task 16: ExportService: PNG (view-shot, 256–4096), SVG, PDF (expo-print), save to gallery, share; backup JSON export/import with zod validation (TDD) + storage management + privacy screens.

## Phase 9 — Verification
### Task 17: tsc, lint, jest, expo-doctor, TODO/FIXME scan, a11y pass, final report.
