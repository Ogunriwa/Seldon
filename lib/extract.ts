import { extractText as extractPdfText, getDocumentProxy } from 'unpdf';

const CODE_EXTENSIONS = new Set([
  '.py', '.ts', '.js', '.jsx', '.tsx', '.rs', '.go', '.java',
  '.c', '.cpp', '.h', '.rb', '.sh', '.yaml', '.yml', '.toml',
  '.xml', '.html', '.css', '.sql',
]);

const TEXT_MIME_PREFIXES = ['text/'];

const TEXT_MIME_TYPES = new Set([
  'application/json',
  'application/xml',
  'application/xhtml+xml',
  'application/x-yaml',
  'application/x-sh',
  'application/javascript',
  'application/typescript',
  'application/x-httpd-php',
  'application/graphql',
  'application/ld+json',
  'application/sql',
  'application/x-perl',
  'application/x-python',
  'application/x-ruby',
  'application/toml',
]);

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot).toLowerCase();
}

function isTextExtractable(mediaType: string, filename: string): boolean {
  // Check text/* MIME prefix
  if (TEXT_MIME_PREFIXES.some((prefix) => mediaType.startsWith(prefix))) {
    return true;
  }

  // Check known text-based MIME types
  if (TEXT_MIME_TYPES.has(mediaType)) {
    return true;
  }

  // Fallback: check file extension for code files
  // This handles application/octet-stream and other generic types
  const ext = getExtension(filename);
  if (CODE_EXTENSIONS.has(ext)) {
    return true;
  }

  return false;
}

export async function extractText(
  buffer: Buffer,
  filename: string,
  mediaType: string,
): Promise<{ text: string | null; error: string | null }> {
  // Handle PDF files
  if (mediaType === 'application/pdf') {
    try {
      const doc = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractPdfText(doc, { mergePages: true });
      const result = Array.isArray(text) ? text.join('\n') : text;
      return { text: result, error: null };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message.toLowerCase() : String(err);

      if (
        message.includes('password') ||
        message.includes('encrypted')
      ) {
        return {
          text: null,
          error: 'This PDF is password-protected',
        };
      }

      return {
        text: null,
        error: 'Could not read this PDF — the file may be damaged',
      };
    }
  }

  // Handle text-based files (plain text, code, JSON, XML, etc.)
  if (isTextExtractable(mediaType, filename)) {
    return { text: buffer.toString('utf-8'), error: null };
  }

  // Unsupported type
  return {
    text: null,
    error: `Unsupported file type: ${mediaType}`,
  };
}
