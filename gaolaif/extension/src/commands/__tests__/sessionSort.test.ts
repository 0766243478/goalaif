import { compareSessionsByCreatedAtDesc, type SessionSummary } from '../sessionSort';

describe('compareSessionsByCreatedAtDesc', () => {
  test('sorts newest session first', () => {
    const sessions: SessionSummary[] = [
      { id: 'a', created_at: 100 },
      { id: 'b', created_at: 300 },
      { id: 'c', created_at: 200 },
    ];
    const sorted = [...sessions].sort(compareSessionsByCreatedAtDesc);
    expect(sorted.map(s => s.id)).toEqual(['b', 'c', 'a']);
  });

  test('sessions without created_at sort last', () => {
    const sessions: SessionSummary[] = [
      { id: 'old', created_at: 10 },
      { id: 'unknown' },
      { id: 'new', created_at: 999 },
    ];
    const sorted = [...sessions].sort(compareSessionsByCreatedAtDesc);
    expect(sorted.map(s => s.id)).toEqual(['new', 'old', 'unknown']);
  });

  test('equal timestamps break ties deterministically by id', () => {
    const sessions: SessionSummary[] = [
      { id: 'a', created_at: 5 },
      { id: 'b', created_at: 5 },
    ];
    const sorted = [...sessions].sort(compareSessionsByCreatedAtDesc);
    expect(sorted.map(s => s.id)).toEqual(['b', 'a']);
  });

  test('is a strict weak ordering (antisymmetric)', () => {
    const a: SessionSummary = { id: 'a', created_at: 1 };
    const b: SessionSummary = { id: 'b', created_at: 2 };
    expect(compareSessionsByCreatedAtDesc(a, b)).toBeGreaterThan(0);
    expect(compareSessionsByCreatedAtDesc(b, a)).toBeLessThan(0);
  });
});
