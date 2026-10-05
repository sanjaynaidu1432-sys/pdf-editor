export interface TextElement {
  id: string;
  page: number;
  text: string;
  bbox: [number, number, number, number]; // [x0, y0, x1, y1]
  origin: [number, number]; // [x, y] baseline
  width: number;
  height: number;
  font: string;
  size: number;
  color: string;
  bg_color?: string;
  bold: boolean;
  italic: boolean;
  ascender?: number;
  descender?: number;
}

export interface EditOperation {
  id: string;
  page: number;
  original_text?: string;
  new_text: string;
  bbox?: [number, number, number, number];
  origin?: [number, number];
  font?: string;
  size?: number;
  color?: string;
  fill_color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  isNew?: boolean;
  appliedAt?: string;
}

export interface PageData {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
  isScanned: boolean;
  imageCount: number;
  elements: TextElement[];
}

export interface DocumentData {
  sessionId: string;
  filename: string;
  fileSize: number;
  pageCount: number;
  isScanned: boolean;
  scannedMessage?: string | null;
  pages: PageData[];
  pdfBase64: string;
  editedPdfBase64?: string;
}

export interface SampleItem {
  id: string;
  name: string;
  title: string;
  description: string;
  pages: number;
  badge: string;
}

export type ToolMode = 'select' | 'addText';
export type ViewMode = 'single' | 'compare-toggle' | 'split-compare';
export type PreviewVersion = 'original' | 'edited';
