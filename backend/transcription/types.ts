export interface TranscriptSegment {
  id?: string;
  start: number;
  end: number;
  text: string;
  confidence?: number;
}

export interface TranscriptionResult {
  fullText: string;
  language: string;
  segments: TranscriptSegment[];
}

export type TranscriptionProgressCallback = (progressPercent: number, statusText: string) => void;

export class CancellationToken {
  private _isCancelled = false;

  get isCancelled(): boolean {
    return this._isCancelled;
  }

  cancel(): void {
    this._isCancelled = true;
  }
}

export interface ITranscriptionProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  transcribe(
    audioFilePath: string,
    options?: {
      language?: string;
      onProgress?: TranscriptionProgressCallback;
      cancellationToken?: CancellationToken;
    }
  ): Promise<TranscriptionResult>;
}
