import { extractText, getDocumentProxy } from "unpdf";
import { AppError } from "@/lib/errors";

/** Every real PDF starts with these bytes. Checking them beats trusting the file name or MIME type. */
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

export function isPdf(bytes: Uint8Array): boolean {
  return PDF_MAGIC.every((byte, i) => bytes[i] === byte);
}

/** Collapse whitespace noise from PDF extraction while keeping line breaks (used for section detection). */
export function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/[ \t ]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

export const MIN_RESUME_CHARS = 200;

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  if (!isPdf(bytes)) {
    throw new AppError("UNSUPPORTED_FILE", "That file is not a valid PDF. Please upload a .pdf resume.");
  }
  try {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return normalizeText(text);
  } catch {
    throw new AppError("UNSUPPORTED_FILE", "We could not read this PDF. Try re-exporting it, or paste the text instead.");
  }
}

export function assertUsableText(text: string): void {
  if (text.length < MIN_RESUME_CHARS) {
    throw new AppError(
      "EMPTY_RESUME",
      "We found almost no text in your resume. If it is a scanned image, please paste the text instead.",
      422,
    );
  }
}
