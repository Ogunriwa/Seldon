import { db } from '@/lib/db/client';
import { projects } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { ProjectList } from '@/components/project-list';

export default async function ProjectsPage() {
  const rows = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.updatedAt));

  return <ProjectList initialProjects={rows} />;
}
