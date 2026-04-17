import { getCurrentOrganizer } from '@/lib/organizer-auth';
import { redirect } from 'next/navigation';
import { OrganizerShell } from './shell';

export const metadata = {
  title: 'BarCrawl Organizer Portal',
  description: 'Manage your bar crawl listings on barcrawl.com',
};

export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const organizer = await getCurrentOrganizer();

  // Public pages that don't need auth
  return <OrganizerShell organizer={organizer}>{children}</OrganizerShell>;
}
