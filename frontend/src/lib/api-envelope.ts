import type { AxiosError, AxiosResponse } from 'axios';

/**
 * Standard backend envelope. Every successful 2xx response from the v2 API
 * looks like this:
 *
 *   { success: true, message: "OK", data: { ... } }
 *
 * Errors look like:
 *
 *   { success: false, message: "Validation failed", errors: { json: { email: ["..."] } } }
 *
 * Use the helpers below instead of `res.data.data.x` / `error.response.data.errors.json.x`
 * so the shape lives in one place.
 */

export interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[] | Record<string, string[]>>;
}

/** Pull the inner `.data` out of a successful response. Throws if the shape is wrong. */
export function unwrap<T>(res: AxiosResponse<Envelope<T>>): T {
  const body = res?.data;
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid response: not a JSON envelope');
  }
  if (body.success !== true) {
    throw new Error(body.message || 'Request failed');
  }
  return body.data;
}

/**
 * Try to extract a user-facing error message from an Axios failure.
 * Falls back to the supplied default.
 */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  const err = error as AxiosError<Envelope<unknown>>;
  return err?.response?.data?.message ?? fallback;
}

/**
 * Field-level validation errors. The backend returns:
 *   { errors: { json: { firstname: ["required"] } } }
 * (Smorest's webargs marshmallow-style payload.)
 */
export function getFieldErrors(error: unknown): Record<string, string> {
  const err = error as AxiosError<Envelope<unknown>>;
  const raw = err?.response?.data?.errors;
  if (!raw) return {};
  // Common shape: { json: { field: ["msg1", "msg2"] } }
  const json = (raw as { json?: Record<string, string[]> }).json;
  if (json && typeof json === 'object') {
    return Object.fromEntries(
      Object.entries(json).map(([field, msgs]) => [field, msgs[0] ?? ''])
    );
  }
  // Fallback: { field: ["msg"] } directly under errors.
  return Object.fromEntries(
    Object.entries(raw as Record<string, string[]>).map(([field, msgs]) => [
      field,
      Array.isArray(msgs) ? msgs[0] ?? '' : String(msgs),
    ])
  );
}

/** Type guard for axios errors with our envelope shape. */
export function isApiError(
  error: unknown
): error is AxiosError<Envelope<unknown>> {
  const err = error as AxiosError;
  return Boolean(err && err.isAxiosError);
}
