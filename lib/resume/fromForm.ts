import { z } from "zod";
import { AppError } from "@/lib/errors";
import { assertUsableText, extractPdfText, normalizeText } from "./extractText";

const ResumeTextSchema = z.string().max(50_000, "Pasted resume is too long.");

/**
 * Get clean resume text from a form: either an uploaded PDF (`resume`) or
 * pasted text (`resumeText`). Shared by every endpoint that reads a resume,
 * so validation rules live in exactly one place.
 */
export async function resumeTextFromForm(form: FormData, maxUploadMb: number): Promise<string> {
  const file = form.get("resume");
  let text: string;

  if (file instanceof File && file.size > 0) {
    if (file.size > maxUploadMb * 1024 * 1024) {
      throw new AppError("FILE_TOO_LARGE", `Please upload a PDF smaller than ${maxUploadMb} MB.`, 413);
    }
    text = await extractPdfText(new Uint8Array(await file.arrayBuffer()));
  } else {
    const pasted = form.get("resumeText");
    if (typeof pasted !== "string" || !pasted.trim()) {
      throw new AppError("INVALID_INPUT", "Upload a PDF resume or paste your resume text.");
    }
    const parsed = ResumeTextSchema.safeParse(pasted);
    if (!parsed.success) throw new AppError("INVALID_INPUT", parsed.error.issues[0].message);
    text = normalizeText(parsed.data);
  }

  assertUsableText(text);
  return text;
}
