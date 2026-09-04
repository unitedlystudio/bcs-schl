export function resolveSchoolRelationship<T extends { schoolId: unknown }>(
  expectedSchoolId: unknown,
  record: T | null
): T | null {
  return record?.schoolId === expectedSchoolId ? record : null;
}
