// ── Imports & Database ──────────────────────────────────────────
// Database schema components to gather the full project workspace state
import { db } from '@/lib/db/client';
import {
  projects,
  conversations,
  libraries as librariesTable,
  memories as memoriesTable,
} from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { ProjectWorkspace } from '@/components/projects/project-workspace';

// ── Project Workspace Page ──────────────────────────────────────
/*
 * Fetches all sub-resources tied to a specific project.
 * Hydrates the workspace (threads, files, and memories) before handing off to the client UI.
 */
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 1. Fetch Core Project
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .get();

  if (!project) notFound();

  // ── Scoped Relationships ──────────────────────────────────────
  
  // Threads scoped to this project
  const threads = await db
    .select()
    .from(conversations)
    .where(eq(conversations.projectId, id))
    .orderBy(desc(conversations.updatedAt));

  // Libraries (attachments/files) scoped to this project
  const libraries = await db
    .select()
    .from(librariesTable)
    .where(eq(librariesTable.projectId, id))
    .orderBy(desc(librariesTable.createdAt));

  // Memories/Knowledge scoped to this project
  const memories = await db
    .select()
    .from(memoriesTable)
    .where(eq(memoriesTable.projectId, id))
    .orderBy(desc(memoriesTable.isPinned), desc(memoriesTable.createdAt));

  // ── Assemble & Render ─────────────────────────────────────────
  const fullProject = {
    ...project,
    threads,
    libraries,
    memories,
  };

  return <ProjectWorkspace key={id} project={fullProject} />;
}
