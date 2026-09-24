export type CodeKind = 'qr' | 'barcode';
export type CodeSource = 'generated' | 'scanned' | 'imported';

/** Formats Qraft can generate. Scanned codes may additionally be datamatrix/pdf417/aztec. */
export type BarcodeFormat =
  | 'ean13'
  | 'ean8'
  | 'upc_a'
  | 'upc_e'
  | 'code39'
  | 'code93'
  | 'code128'
  | 'itf14'
  | 'codabar';

export type CodeFormat = 'qr' | BarcodeFormat | 'datamatrix' | 'pdf417' | 'aztec' | 'unknown';

export type QRContentType =
  | 'url'
  | 'text'
  | 'wifi'
  | 'vcard'
  | 'email'
  | 'phone'
  | 'sms'
  | 'whatsapp'
  | 'telegram'
  | 'location'
  | 'event'
  | 'social'
  | 'youtube'
  | 'spotify'
  | 'applink'
  | 'bitcoin'
  | 'payment';

/** Content types understood by the scan parser (superset used for display). */
export type ContentType = QRContentType | 'product' | 'barcode';

export interface CodeRecord {
  id: string;
  kind: CodeKind;
  format: CodeFormat;
  contentType: ContentType;
  payload: string;
  title: string | null;
  note: string | null;
  isFavorite: boolean;
  folderId: string | null;
  source: CodeSource;
  /** JSON-serialised form values so a generated code can be re-edited. */
  formData: string | null;
  createdAt: number;
  updatedAt: number;
}

export type ModuleStyle =
  | 'square'
  | 'rounded'
  | 'dots'
  | 'circle'
  | 'diamond'
  | 'softSquare'
  | 'classy'
  | 'extraRounded';

export type EyeFrameStyle = 'square' | 'rounded' | 'circle' | 'extraRounded' | 'leaf' | 'diamond';
export type EyeBallStyle = 'square' | 'circle' | 'rounded' | 'diamond';
export type GradientType = 'none' | 'linear' | 'radial';
export type ErrorCorrection = 'L' | 'M' | 'Q' | 'H';

export type FrameType =
  | 'none'
  | 'scanMe'
  | 'open'
  | 'visit'
  | 'connect'
  | 'menu'
  | 'follow'
  | 'custom';

export type FrameLayout = 'bottom' | 'top' | 'card' | 'bubble' | 'badge' | 'minimal';

export interface QRDesign {
  bodyStyle: ModuleStyle;
  eyeFrameStyle: EyeFrameStyle;
  eyeStyle: EyeBallStyle;
  foregroundColor: string;
  backgroundColor: string;
  transparentBackground: boolean;
  gradientType: GradientType;
  gradientStart: string;
  gradientEnd: string;
  gradientAngle: number;
  /** Colour for the outer eye frame. */
  cornerColor: string;
  /** Colour for the inner eyeball. */
  eyeColor: string;
  errorCorrection: ErrorCorrection;
  quietZone: number;
  logoUri: string | null;
  /** Fraction of QR width, 0..0.35 */
  logoSize: number;
  logoPadding: number;
  logoBackground: string;
  logoRounded: boolean;
  frameType: FrameType;
  frameLayout: FrameLayout;
  frameText: string;
  frameColor: string;
  frameTextColor: string;
  frameFontSize: number;
}

export interface BarcodeOptions {
  foregroundColor: string;
  backgroundColor: string;
  showText: boolean;
  textPosition: 'bottom' | 'top';
  margin: number;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
  count?: number;
}

export interface Tag {
  id: string;
  name: string;
}

export interface ScanSession {
  id: string;
  name: string;
  createdAt: number;
  itemCount?: number;
}
