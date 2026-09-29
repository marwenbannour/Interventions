import { firstIndexAfter, MaintenanceFrequency, occurrenceAt } from './recurrence';

const F = MaintenanceFrequency;
const iso = (d: Date) => d.toISOString().slice(0, 16);

describe('Récurrence des plans de maintenance', () => {
  const start = new Date('2026-01-31T08:30:00Z');

  it('mensuel : pas de dérive de fin de mois (ancrage sur la date initiale)', () => {
    expect([0, 1, 2, 3].map((n) => iso(occurrenceAt(start, F.MONTHLY, 1, n)))).toEqual([
      '2026-01-31T08:30', '2026-02-28T08:30', '2026-03-31T08:30', '2026-04-30T08:30',
    ]);
  });

  it('année bissextile : 29 février en annuel', () => {
    const leap = new Date('2028-02-29T10:00:00Z');
    expect(iso(occurrenceAt(leap, F.YEARLY, 1, 1))).toBe('2029-02-28T10:00');
    expect(iso(occurrenceAt(leap, F.YEARLY, 1, 4))).toBe('2032-02-29T10:00');
  });

  it('trimestriel = mensuel intervalle 3, passage d’année', () => {
    expect(iso(occurrenceAt(new Date('2026-11-15T07:00:00Z'), F.MONTHLY, 3, 1))).toBe('2027-02-15T07:00');
  });

  it('quotidien / hebdomadaire avec intervalle', () => {
    const d = new Date('2026-03-01T06:00:00Z');
    expect(iso(occurrenceAt(d, F.DAILY, 2, 3))).toBe('2026-03-07T06:00');
    expect(iso(occurrenceAt(d, F.WEEKLY, 2, 1))).toBe('2026-03-15T06:00');
  });

  it('firstIndexAfter saute les occurrences passées', () => {
    const d = new Date('2026-01-01T00:00:00Z');
    expect(firstIndexAfter(d, F.WEEKLY, 1, new Date('2026-01-20T00:00:00Z'))).toBe(3); // 01, 08, 15 passées → 22
    expect(firstIndexAfter(d, F.WEEKLY, 1, new Date('2025-12-01T00:00:00Z'))).toBe(0);
  });
});
