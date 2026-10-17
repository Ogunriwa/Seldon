import type { UIMessage } from 'ai';
import { ModelCapabilities, resolveNumCtx } from '../../ollama';
import { OUTPUT_RESERVE, THINKING_RESERVE, DOC_SHARE, estimateTokens, pinnedMemoryLimit } from '../limits';
import { loadProject } from './project';
import { loadPinnedMemories } from './memories';
import { loadLibraryDocs } from './library';
import { loadAttachmentDocs } from './attachments';
import { packDocuments, trimHistory, messageTokens } from './budget';
import { buildSystemPrompt, buildDocumentMessages } from './assemble';

export async function buildChatContext(args: {
  conversationId: string;
  messages: UIMessage[];
  caps: ModelCapabilities;
  pendingAttachmentIds?: string[];
}) {
  const numCtx = resolveNumCtx(args.caps.contextLength);
  const outputReserve = Math.min(
    OUTPUT_RESERVE + (args.caps.thinking ? THINKING_RESERVE : 0),
    Math.floor(numCtx * 0.25),   // tiny windows: never reserve more than a quarter
  );

  const project = await loadProject(args.conversationId);
  const mem = project
    ? await loadPinnedMemories(project.projectId, pinnedMemoryLimit(numCtx))
    : { items: [], dropped: 0 };
  const docs = [
    ...(project ? await loadLibraryDocs(project.projectId) : []), // priority 1
    ...(await loadAttachmentDocs(args.conversationId, args.pendingAttachmentIds)), // priority 2
  ];

  const system = buildSystemPrompt({ instructions: project?.instructions, memories: mem.items, hasDocuments: docs.length > 0 });
  const latest = args.messages.at(-1);
  const available = numCtx - outputReserve - estimateTokens(system ?? '') - 60; // 60 ≈ doc message wrapper and ack
  const docBudget = Math.max(0, Math.min(Math.floor(numCtx * DOC_SHARE), available - (latest ? messageTokens(latest) : 0)));

  const { packed, skipped, usedTokens } = packDocuments(docs, docBudget);
  const { kept, dropped } = trimHistory(args.messages, available - usedTokens);

  return {
    numCtx,
    system,
    documentMessages: buildDocumentMessages(packed),
    history: kept,
    report: {
      numCtx,
      estimatedPromptTokens: numCtx - outputReserve - (available - usedTokens - kept.reduce((n, m) => n + messageTokens(m), 0)),
      docsIncluded: packed.length,
      docsTruncated: packed.filter((d) => d.truncatedFrom).map((d) => d.name),
      docsSkipped: skipped,
      historyDropped: dropped,
      memoriesDropped: mem.dropped,
    },
  };
}
