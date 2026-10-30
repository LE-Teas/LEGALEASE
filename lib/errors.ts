/**
 * Small, dependency-free helpers for turning thrown values into safe strings.
 *
 * `catch` bindings are `unknown` under `strict` (useUnknownInCatchVariables).
 * Prefer these helpers over `err: any`, and never surface raw database or
 * provider errors to the browser without context.
 */

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "";
}

export function errorMessageWith(error: unknown, fallback: string): string {
  return getErrorMessage(error) || fallback;
}
