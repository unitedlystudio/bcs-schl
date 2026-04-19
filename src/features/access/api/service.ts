import { matchSorter } from 'match-sorter';
import type { AccessFilters, AccessRecord, AccessRecordsResponse } from './types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const seededAccessRecords: AccessRecord[] = [
  {
    id: 1,
    category: 'Business Suite',
    platform: 'NAP',
    fullName: '',
    loginUrl: '',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 2,
    category: 'Business Suite',
    platform: 'ICloud',
    fullName: '',
    loginUrl: '',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 3,
    category: 'Business Suite',
    platform: 'WhatsApp',
    fullName: '',
    loginUrl: '',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 4,
    category: 'Business Suite',
    platform: 'Google Account',
    fullName: '',
    loginUrl: 'https://accounts.google.com',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Partial'
  },
  {
    id: 5,
    category: 'Business Suite',
    platform: 'GMB',
    fullName: '',
    loginUrl: 'https://business.google.com',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 6,
    category: 'Business Suite',
    platform: 'FB-BS',
    fullName: '',
    loginUrl: 'https://business.facebook.com',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 7,
    category: 'Business Suite',
    platform: 'Gmail',
    fullName: '',
    loginUrl: 'https://mail.google.com',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Partial'
  },
  {
    id: 8,
    category: 'Business Suite',
    platform: 'Gmail TPA',
    fullName: '',
    loginUrl: 'https://mail.google.com',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 9,
    category: 'Business Suite',
    platform: 'Gmail KB',
    fullName: '',
    loginUrl: 'https://mail.google.com',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 10,
    category: 'Business Suite',
    platform: 'Gmail TK',
    fullName: '',
    loginUrl: 'https://mail.google.com',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 11,
    category: 'Business Suite',
    platform: 'Gmail Pajak',
    fullName: '',
    loginUrl: 'https://mail.google.com',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 12,
    category: 'Business Suite',
    platform: 'Pajak',
    fullName: '',
    loginUrl: '',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 13,
    category: 'Business Suite',
    platform: 'Google Drive',
    fullName: '',
    loginUrl: 'https://drive.google.com',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Ready'
  },
  {
    id: 14,
    category: 'Business Suite',
    platform: 'Google Maps',
    fullName: '',
    loginUrl: 'https://maps.google.com',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Partial'
  },
  {
    id: 15,
    category: 'Business Suite',
    platform: 'Google Workspace',
    fullName: '',
    loginUrl: 'https://admin.google.com',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Partial'
  },
  {
    id: 16,
    category: 'Business Suite',
    platform: 'Twinkl Classroom 1',
    fullName: '',
    loginUrl: 'https://www.twinkl.com',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 17,
    category: 'Business Suite',
    platform: 'Twinkl Classroom 2',
    fullName: '',
    loginUrl: 'https://www.twinkl.com',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 18,
    category: 'Business Suite',
    platform: 'Twinkl Classroom 3',
    fullName: '',
    loginUrl: 'https://www.twinkl.com',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 19,
    category: 'Business Suite',
    platform: 'Twinkl Classroom 4',
    fullName: '',
    loginUrl: 'https://www.twinkl.com',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 20,
    category: 'Business Suite',
    platform: 'Twinkl Classroom 5',
    fullName: '',
    loginUrl: 'https://www.twinkl.com',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 21,
    category: 'Business Suite',
    platform: 'Twinkl Classroom 6',
    fullName: '',
    loginUrl: 'https://www.twinkl.com',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 22,
    category: 'Business Suite',
    platform: 'OSS NIB',
    fullName: '',
    loginUrl: '',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 23,
    category: 'Business Suite',
    platform: 'Zoom',
    fullName: '',
    loginUrl: 'https://zoom.us/signin',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Partial'
  },
  {
    id: 24,
    category: 'Subscriptions',
    platform: 'Twinkl Subscription',
    fullName: '',
    loginUrl: 'https://www.twinkl.com',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Partial'
  },
  {
    id: 25,
    category: 'Subscriptions',
    platform: 'A-Z Reading',
    fullName: '',
    loginUrl: 'https://www.kidsa-z.com',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 26,
    category: 'Subscriptions',
    platform: 'White Rose',
    fullName: '',
    loginUrl: 'https://whiteroseeducation.com',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 27,
    category: 'Subscriptions',
    platform: 'Jolly phonics',
    fullName: '',
    loginUrl: 'https://www.jollylearning.co.uk',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 28,
    category: 'Subscriptions',
    platform: 'Top Guru',
    fullName: '',
    loginUrl: '',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 29,
    category: 'Subscriptions',
    platform: 'Canva',
    fullName: '',
    loginUrl: 'https://www.canva.com/login',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Ready'
  },
  {
    id: 30,
    category: 'Social Media',
    platform: 'Facebook',
    fullName: '',
    loginUrl: 'https://www.facebook.com/login',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Partial'
  },
  {
    id: 31,
    category: 'Social Media',
    platform: 'Instagram',
    fullName: '',
    loginUrl: 'https://www.instagram.com/accounts/login',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Partial'
  },
  {
    id: 32,
    category: 'Social Media',
    platform: 'Twitter',
    fullName: '',
    loginUrl: 'https://x.com/i/flow/login',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 33,
    category: 'Social Media',
    platform: 'Pintrest',
    fullName: '',
    loginUrl: 'https://www.pinterest.com/login',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 34,
    category: 'Social Media',
    platform: 'TikTok',
    fullName: '',
    loginUrl: 'https://www.tiktok.com/login',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Needs setup'
  },
  {
    id: 35,
    category: 'Social Media',
    platform: 'YouTube',
    fullName: '',
    loginUrl: 'https://studio.youtube.com',
    username: '',
    password: '',
    listingUrl: '',
    adminsAccess: '',
    recoveryNumber: '',
    status: 'Partial'
  }
];

const toArray = (value?: string) =>
  value
    ? String(value)
        .split(/[.,]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

export async function getAccessRecords(filters: AccessFilters): Promise<AccessRecordsResponse> {
  const { page = 1, limit = 10, categories, statuses, search, sort } = filters;

  await delay(150);

  let records = [...seededAccessRecords];

  const categoryFilters = toArray(categories);
  const statusFilters = toArray(statuses);

  if (categoryFilters.length > 0) {
    records = records.filter((record) => categoryFilters.includes(record.category));
  }

  if (statusFilters.length > 0) {
    records = records.filter((record) => statusFilters.includes(record.status));
  }

  if (search) {
    records = matchSorter(records, search, {
      keys: ['platform', 'category', 'fullName', 'username', 'adminsAccess', 'recoveryNumber']
    });
  }

  if (sort) {
    try {
      const sortItems = JSON.parse(sort) as { id: keyof AccessRecord; desc: boolean }[];
      if (sortItems.length > 0) {
        const { id, desc } = sortItems[0];
        records.sort((a, b) => {
          const aValue = String(a[id] ?? '').toLowerCase();
          const bValue = String(b[id] ?? '').toLowerCase();
          return desc ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
        });
      }
    } catch {
      // ignore invalid sort payloads
    }
  }

  const totalRecords = records.length;
  const offset = (page - 1) * limit;

  return {
    success: true,
    time: new Date().toISOString(),
    message: 'Seeded from the Company Details workbook structure',
    total_records: totalRecords,
    offset,
    limit,
    records: records.slice(offset, offset + limit)
  };
}
