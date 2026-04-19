import PageContainer from '@/components/layout/page-container';
import AccessListingPage from '@/features/access/components/access-listing';
import { accessInfoContent } from '@/features/access/info-content';
import { searchParamsCache } from '@/lib/searchparams';
import type { SearchParams } from 'nuqs/server';

export const metadata = {
  title: 'Dashboard: Platform Access'
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function AccessPage(props: PageProps) {
  const searchParams = await props.searchParams;
  searchParamsCache.parse(searchParams);

  return (
    <PageContainer
      pageTitle='Platform Access'
      pageDescription='Structured inventory for the spreadsheet of online profiles, logins, and admin access.'
      infoContent={accessInfoContent}
    >
      <AccessListingPage />
    </PageContainer>
  );
}
