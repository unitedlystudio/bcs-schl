import { queryOptions } from '@tanstack/react-query';
import { getAccessRecords } from './service';
import type { AccessFilters, AccessRecord } from './types';

export type { AccessRecord };

export const accessKeys = {
  all: ['access-records'] as const,
  list: (filters: AccessFilters) => [...accessKeys.all, 'list', filters] as const
};

export const accessRecordsQueryOptions = (filters: AccessFilters) =>
  queryOptions({
    queryKey: accessKeys.list(filters),
    queryFn: () => getAccessRecords(filters)
  });
