import { AppError, toErrorBody } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { RateLimiter } from "@/lib/rateLimit";

/**
 * Shared plumbing for every API route ("cross-cutting concerns").
 *
 * Each route only writes its business logic; this wrapper adds:
 *  - a request id (returned in a header and in error bodies, for support/debugging)
 *  - per-client rate limiting
 *  - one consistent response shape: { data } on success, { error: { code, message, requestId } } on failure
 *  - structured logs with timing
 *
 * This is the "Don't Repeat Yourself" principle and the same idea as
 * middleware in Express or interceptors in Spring.
 */

export function clientId(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export interface HandlerContext<P> {
  requestId: string;
  params: P;
}

type Handler<T, P> = (
  request: Request,
  ctx: HandlerContext<P>,
) => Promise<{ data: T; status?: number; log?: Record<string, unknown> }>;

export function apiHandler<T, P = Record<string, never>>(name: string, limiter: RateLimiter | null, handle: Handler<T, P>) {
  return async function (request: Request, context?: { params: Promise<P> }): Promise<Response> {
    const requestId = crypto.randomUUID();
    const started = Date.now();
    try {
      if (limiter) {
        const retryAfter = limiter.check(clientId(request));
        if (retryAfter > 0) {
          throw new AppError("RATE_LIMITED", `Too many requests. Try again in ${retryAfter}s.`, 429);
        }
      }
      const params = (context ? await context.params : {}) as P;
      const { data, status = 200, log } = await handle(request, { requestId, params });
      logger.info(`${name}.ok`, { requestId, ms: Date.now() - started, ...log });
      return Response.json({ data }, { status, headers: { "x-request-id": requestId } });
    } catch (err) {
      const { status, body } = toErrorBody(err, requestId);
      if (status >= 500) {
        logger.error(`${name}.error`, { requestId, error: err instanceof Error ? err.stack : String(err) });
      } else {
        logger.warn(`${name}.rejected`, { requestId, code: body.error.code });
      }
      return Response.json(body, { status, headers: { "x-request-id": requestId } });
    }
  };
}

/** Parse multipart form data, turning a malformed body into a clean 400. */
export async function readForm(request: Request): Promise<FormData> {
  try {
    return await request.formData();
  } catch {
    throw new AppError("INVALID_INPUT", "Expected a multipart form upload.");
  }
}

/** Parse a JSON body, turning malformed JSON into a clean 400. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("INVALID_INPUT", "Expected a JSON body.");
  }
}

/** First Zod issue as a user-facing message. */
export function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Invalid input.";
}
