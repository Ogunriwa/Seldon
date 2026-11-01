// ── Imports & Providers ────────────────────────────────────────
// State providers for tabs and sidebar, and core layout components
import { TabsProvider } from '@/lib/tabs-context';
import { SidebarProvider } from '@/lib/sidebar-context';
import { TabBar } from '@/components/layout/tab-bar';
import { SideNav } from '@/components/layout/side-nav';
import { SidebarTrigger } from '@/components/layout/sidebar-trigger';

// ── Persistent Shell Layout ────────────────────────────────────
/*
 * Wraps all (chat) routes with the global application shell.
 * Provides Contexts for managing tab and sidebar state across the 
 * workspace, rendering the TabBar on top and SideNav on the left.
 */
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TabsProvider>
      <SidebarProvider>
        <div className="flex flex-col h-dvh w-full overflow-hidden bg-background text-foreground antialiased">
          {/* Top Horizontal Tab-Strip */}
          <TabBar />

          {/* Main Workspace Area */}
          <div className="relative flex flex-1 w-full overflow-hidden">
            <SideNav />
            <main className="relative flex flex-1 flex-col h-full min-w-0 overflow-y-auto">
              <SidebarTrigger />
              <div className="relative flex flex-1 flex-col min-h-0 w-full">
                {children}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </TabsProvider>
  );
}
