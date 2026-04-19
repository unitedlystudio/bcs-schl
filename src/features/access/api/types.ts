export type AccessCategory = 'Business Suite' | 'Subscriptions' | 'Social Media';

export type AccessStatus = 'Needs setup' | 'Partial' | 'Ready';

export type AccessRecord = {
  id: string;
  category: AccessCategory;
  platform: string;
  fullName: string;
  loginUrl: string;
  username: string;
  password: string;
  listingUrl: string;
  adminsAccess: string;
  recoveryNumber: string;
  status: AccessStatus;
};

export type AccessFilters = {
  page?: number;
  limit?: number;
  categories?: string;
  statuses?: string;
  search?: string;
  sort?: string;
};

export type AccessRecordsResponse = {
  success: boolean;
  time: string;
  message: string;
  total_records: number;
  offset: number;
  limit: number;
  records: AccessRecord[];
};
