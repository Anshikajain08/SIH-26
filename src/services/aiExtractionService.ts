import { DisciplineType, EventStatus, ProgressEvent } from '../types';

export interface ExtractedProgressEvent extends Omit<ProgressEvent, 'id' | 'sourceDocId' | 'sourceType' | 'extractionProvider'> {
  extractionConfidence: number;
  extractionWarnings: string[];
}

export interface ExtractionResponse {
  provider: 'GEMINI';
  model: string;
  events: ExtractedProgressEvent[];
}

export async function extractProgressEvents(rawText: string, eventDate: string): Promise<ExtractionResponse> {
  const response = await fetch('/api/extract-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText, eventDate }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Gemini extraction failed.' }));
    throw new Error(payload.error || `Gemini extraction failed (${response.status}).`);
  }

  return response.json() as Promise<ExtractionResponse>;
}

export function createDeterministicFallbackEvent(rawText: string, eventDate: string): ExtractedProgressEvent {
  const lower = rawText.toLowerCase();
  const isCivil = lower.includes('civil') || lower.includes('pour') || lower.includes('f11');
  const isElectrical = lower.includes('cable') || lower.includes('feeder') || lower.includes('substation');
  const discipline: DisciplineType = isCivil ? 'CIVIL' : isElectrical ? 'ELECTRICAL' : 'PIPING';
  const objectOrTag = lower.includes('24a') || lower.includes('spool') ? 'Line 24A' : isCivil ? 'Foundation F-11' : isElectrical ? 'Feeder-01 / Substation 02' : 'Plant Package';
  const status: EventStatus = lower.includes('delay') || lower.includes('hold') || lower.includes('pending') ? 'HOLD' : lower.includes('complete') || lower.includes('done') || lower.includes('poured') ? 'COMPLETED' : 'IN_PROGRESS';

  return {
    rawTextExcerpt: rawText.slice(0, 300),
    normalizedActivityText: `Field progress update for ${objectOrTag}`,
    discipline,
    action: isCivil ? 'POUR CONCRETE' : isElectrical ? 'CABLE PULL' : 'PROGRESS UPDATE',
    objectOrTag,
    eventDate,
    status,
    difficulty: 'PARAPHRASED',
    extractionConfidence: 0.35,
    extractionWarnings: ['Gemini was unavailable; deterministic fallback was used.'],
  };
}