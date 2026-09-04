import { permanentRedirect } from 'next/navigation';

export const metadata = {
  title: 'Schly Engineering System Report',
  robots: { index: false, follow: false }
};

export default function SchlyManagementReportRedirect() {
  permanentRedirect('/schly-management.html');
}
