import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { TopBar } from '@/components/top-bar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
