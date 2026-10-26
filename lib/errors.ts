/**
 * One error type for expected failures, with a stable machine-readable code
 * and an HTTP status. The API turns these into a consistent JSON shape:
 *   { "error": { "code": "FILE_TOO_LARGE", "message": "..." } }
 * Unexpected errors become a generic 500 so internals never leak to users.
 */
export type ErrorCode =
  | "INVALID_INPUT"
  | "UNSUPPORTED_FILE"
  | "FILE_TOO_LARGE"
  | "EMPTY_RESUME"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "INTERNAL";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string; requestId?: string };
}

export function toErrorBody(err: unknown, requestId?: string): { status: number; body: ApiErrorBody } {
  if (err instanceof AppError) {
    return { status: err.status, body: { error: { code: err.code, message: err.message, requestId } } };
  }
  return {
    status: 500,
    body: { error: { code: "INTERNAL", message: "Something went wrong. Please try again.", requestId } },
  };
}
