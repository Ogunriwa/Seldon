'use client';

// ── Imports ──────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { FileText, FileCode, FileSpreadsheet, File, X, AlertCircle } from 'lucide-react';

export type AttachmentInfo = {
  id: string;
  filename: string;
  mediaType: string;
  sizeBytes: number;
  extractedText?: string | null;
  data?: string | null;
  error?: string | null;
};

// ── Helpers ──────────────────────────────────────────────────────────
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageType(mediaType: string, filename: string): boolean {
  if (mediaType.startsWith('image/')) return true;
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext);
}

function FileIcon({ mediaType, filename }: { mediaType: string; filename: string }) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const codeExts = new Set([
    'py', 'ts', 'js', 'jsx', 'tsx', 'rs', 'go', 'java', 'c', 'cpp', 'h',
    'rb', 'sh', 'swift', 'kt', 'scala', 'lua', 'php', 'ex', 'zig', 'dart',
    'sql', 'graphql', 'html', 'css', 'scss',
  ]);
  const dataExts = new Set(['csv', 'json', 'xml', 'yaml', 'yml', 'toml']);

  if (codeExts.has(ext)) return <FileCode className="h-4 w-4 shrink-0" />;
  if (dataExts.has(ext)) return <FileSpreadsheet className="h-4 w-4 shrink-0" />;
  if (mediaType === 'application/pdf' || ext === 'pdf') return <FileText className="h-4 w-4 shrink-0" />;
  return <File className="h-4 w-4 shrink-0" />;
}

/*
 * ── StagedFiles Component ─────────────────────────────────────────
 * Displays files currently selected in the composer but not yet sent.
 * Manages local object URLs for image previews to prevent memory leaks.
 */
export function StagedFiles({
  files,
  onRemove,
}: {
  files: Array<{ file: File; id: string }>;
  onRemove: (id: string) => void;
}) {
  // Object URLs for image previews; revoked when the file set changes.
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    const urls: Record<string, string> = {};
    for (const { file, id } of files) {
      if (isImageType(file.type, file.name)) {
        urls[id] = URL.createObjectURL(file);
      }
    }
    setThumbs(urls);
    return () => {
      for (const url of Object.values(urls)) URL.revokeObjectURL(url);
    };
  }, [files]);

  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-1 pt-2">
      {files.map(({ file, id }) => (
        <div
          key={id}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
        >
          {thumbs[id] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbs[id]} alt={file.name} className="h-6 w-6 shrink-0 rounded object-cover" />
          ) : (
            <FileIcon mediaType={file.type} filename={file.name} />
          )}
          <span className="max-w-[140px] truncate">{file.name}</span>
          <span className="text-muted-foreground">{formatSize(file.size)}</span>
          <button
            type="button"
            onClick={() => onRemove(id)}
            className="ml-0.5 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

/*
 * ── AttachmentBadges Component ────────────────────────────────────
 * Displays files that have already been attached and sent with a message.
 * Fetches small thumbnails using base64 data if available.
 */
export function AttachmentBadges({
  attachments,
}: {
  attachments: AttachmentInfo[];
}) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {attachments.map((a) => {
        const isImage = isImageType(a.mediaType, a.filename);
        const thumb = isImage
          ? a.data
            ? `data:${a.mediaType};base64,${a.data}`
            : `/api/attachments/${a.id}`
          : null;

        return (
          <div
            key={a.id}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
              a.error
                ? 'border border-destructive/40 bg-destructive/10 text-destructive'
                : 'border border-border bg-background/60 text-muted-foreground'
            }`}
          >
            {a.error ? (
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            ) : thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt={a.filename} className="h-6 w-6 shrink-0 rounded object-cover" />
            ) : (
              <FileIcon mediaType={a.mediaType} filename={a.filename} />
            )}
            <span className="max-w-[160px] truncate">{a.filename}</span>
            {a.error && (
              <span className="max-w-[200px] truncate text-[10px] opacity-80">
                — {a.error}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
