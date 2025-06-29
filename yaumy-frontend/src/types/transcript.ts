export interface TranscriptSegment {
  id: string;
  text: string;
  start: number;
  end: number;
  speaker?: string;
}

export interface Transcript {
  id: string;
  segments: TranscriptSegment[];
  language?: string;
  duration: number;
}