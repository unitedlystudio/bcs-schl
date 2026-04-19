import type { AccessFilters, AccessRecordsResponse } from './types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getAccessRecords(filters: AccessFilters): Promise<AccessRecordsResponse> {
  await delay(50);

  return {
    success: true,
    time: new Date().toISOString(),
    message: 'Legacy mock access service retained for compatibility; live UI now uses Convex.',
    total_records: 0,
    offset: Math.max(0, ((filters.page ?? 1) - 1) * (filters.limit ?? 10)),
    limit: filters.limit ?? 10,
    records: []
  };
}
