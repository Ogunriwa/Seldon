// ── Imports & Database ──────────────────────────────────────────
// Database client and schema to fetch top-level projects summary
import { db } from '@/lib/db/client';
import { projects, conversations } from '@/lib/db/schema';
import { desc, sql } from 'drizzle-orm';
import { ProjectsDashboard } from '@/components/projects/projects-dashboard';

// ── Projects Dashboard Page ─────────────────────────────────────
/*
 * Renders the primary dashboard listing all user workspaces/projects.
 * Computes rolled-up stats (thread count) directly in SQL
 * and passes the hydrated list down to the client dashboard component.
 */
export default async function ProjectsPage() {
  // Query all projects, calculating relational counts using subqueries
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      emoji: projects.emoji,
      description: projects.description,
      instructions: projects.instructions,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      threadsCount: sql<number>`(SELECT COUNT(*) FROM ${conversations} WHERE ${conversations.projectId} = ${projects.id})`,
    })
    .from(projects)
    .orderBy(desc(projects.updatedAt));

  return <ProjectsDashboard initialProjects={rows} />;
}
