export interface SessionSummary {
  id?: string;
  status?: string;
  findings_count?: number;
  created_at?: number;
}

export function compareSessionsByCreatedAtDesc(a: SessionSummary, b: SessionSummary): number {
  const at = a.created_at ?? 0;
  const bt = b.created_at ?? 0;
  if (at !== bt) return bt - at;
  const aid = a.id ?? '';
  const bid = b.id ?? '';
  if (aid !== bid) return aid < bid ? 1 : -1;
  return 0;
}
