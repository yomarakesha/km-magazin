import * as Sentry from "@sentry/nextjs";

/** Server-side Sentry. No SENTRY_DSN in env → everything below is a no-op,
 *  so local dev without a Sentry account costs nothing. */
export function register() {
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}

export const onRequestError = Sentry.captureRequestError;
