import { describe, expect, it } from 'vitest';
import { resolveSchoolRelationship } from '../../convex/lib/schoolRelationships';

describe('finance relationship ownership', () => {
  it('returns only records owned by the expected school', () => {
    const local = { schoolId: 'school-a', privateName: 'Local student' };
    const foreign = { schoolId: 'school-b', privateName: 'Foreign student' };

    expect(resolveSchoolRelationship('school-a', local)).toBe(local);
    expect(resolveSchoolRelationship('school-a', foreign)).toBeNull();
    expect(resolveSchoolRelationship('school-a', null)).toBeNull();
  });
});
