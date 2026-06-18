export interface Position {
  x: number;
  y: number;
}

export interface DrawingPath {
  id: string;
  points: Position[];
  color: string;
  width: number;
  type: 'pen' | 'highlight';
}

export interface TextAnnotation {
  id: string;
  text: string;
  x: number; // percentage (0-100) or pixels relative to visual page size
  y: number;
  fontSize: number;
  color: string;
}

export interface PageState {
  pageNumber: number;
  rotation: number; // degrees: 0, 90, 180, 270
  isDeleted: boolean;
  originalIndex: number; // to construct correct pdf-lib transformations
}

export interface ReadingSettings {
  theme: 'light' | 'dark' | 'sepia' | 'emerald';
  fontSize: number; // 14 to 32px
  autoScrollSpeed: number; // 0 (stopped) to 10
  isAutoScrolling: boolean;
  isTtsReading: boolean;
  ttsVoice: SpeechSynthesisVoice | null;
  ttsRate: number; // 0.5 to 2
}

export interface AppDocument {
  name: string;
  size: number;
  fileData?: File; // original file if uploaded
  arrayBuffer: ArrayBuffer;
  totalPages: number;
}
