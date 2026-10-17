// ── Imports ────────────────────────────────────────────────────
// Main view component for the home dashboard
import { HomeView } from '@/components/home/home-view';

// ── Home Page Route ────────────────────────────────────────────
// Server component rendering the default HomeView on the root path
export default function HomePage() {
  return <HomeView />;
}
