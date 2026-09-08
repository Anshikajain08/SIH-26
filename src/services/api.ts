import { Activity, AuditLogEntry, MatchRecord, ProgressEvent, SourceDocument } from '../types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed: ${response.status}`);
  return payload as T;
}

export const api = {
  activities: () => request<Activity[]>('/api/activities'),
  documents: () => request<SourceDocument[]>('/api/documents'),
  events: () => request<ProgressEvent[]>('/api/events'),
  matches: () => request<MatchRecord[]>('/api/matches'),
  auditLogs: () => request<AuditLogEntry[]>('/api/audit-logs'),
  uploadSchedule: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ importedCount: number; skippedCount: number; errors: string[] }>('/api/import/schedule', { method: 'POST', body: form });
  },
  uploadDocument: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ document: SourceDocument; events: ProgressEvent[]; matches: MatchRecord[] }>('/api/documents', { method: 'POST', body: form });
  },
  review: (matchId: string, action: 'approve' | 'reject' | 'override' | 'unmatched', body: { activityId?: string; reason?: string }) => request<MatchRecord>(`/api/matches/${matchId}/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
};
