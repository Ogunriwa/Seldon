import { Sidebar } from '@/components/sidebar';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh">
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
