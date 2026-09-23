// Prisma <= 6: import { Prisma } from '@prisma/client' and use Prisma.PrismaClientKnownRequestError.
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { ok, err, Result, ResultAsync } from 'neverthrow';

/** A Prisma error code (e.g. `'P2025'`) or a list of them. */
export type PrismaErrorCode = string | readonly string[];

const codeMatches = (expected: PrismaErrorCode, actual: string): boolean =>
  typeof expected === 'string' ? expected === actual : expected.includes(actual);

const isThenable = (x: unknown): x is PromiseLike<unknown> =>
  (typeof x === 'object' || typeof x === 'function') &&
  x !== null &&
  typeof (x as { then?: unknown }).then === 'function';

/**
 * Handles `PrismaClientKnownRequestError`.
 * Some query functions throw this error, e.g. `update` and `delete` throw `P2025` when the row is not found.
 *
 * Calls `f` and catches this error (only for the given code(s); everything else is rethrown).
 * - On success, the result of `f()` is returned.
 * - On a matching error, `onError(err)` is returned, or `null` if `onError` is not provided.
 *
 * The return type follows `f`:
 * - `f` returns a promise (an `async` function or a Prisma query): a promise is returned, and `onError` may be async.
 * - `f` returns a plain value: a plain value is returned, with no promise involved.
 *
 * @param code Code to handle, or an array of codes, e.g. `'P2025'`.
 * @param f Function to call.
 * @param onError Called with the error when it matches `code`.
 */
export function handleKnownRequestError<T, R = null>(
  code: PrismaErrorCode,
  f: () => Promise<T>,
  onError?: (e: PrismaClientKnownRequestError) => R | Promise<R>,
): Promise<T | R>;
export function handleKnownRequestError<T, R = null>(
  code: PrismaErrorCode,
  f: () => T,
  onError?: (e: PrismaClientKnownRequestError) => R,
): T | R;
export function handleKnownRequestError(
  code: PrismaErrorCode,
  f: () => unknown,
  onError?: (e: PrismaClientKnownRequestError) => unknown,
): unknown {
  const handle = (e: unknown): unknown => {
    if (e instanceof PrismaClientKnownRequestError && codeMatches(code, e.code)) {
      return onError ? onError(e) : null;
    }
    throw e;
  };

  try {
    const result = f();
    // Prisma queries are lazy thenables: nothing runs until `.then` is called, and they are not
    // guaranteed to be `instanceof Promise`. `Promise.resolve` adopts them and starts the query.
    return isThenable(result) ? Promise.resolve(result).catch(handle) : result;
  } catch (e) {
    return handle(e); // `f` threw synchronously
  }
}


/**
 * Passed to the error mapper for every failure.
 * - `caught` is set when the error is a `PrismaClientKnownRequestError` whose code matched `code`.
 * - `uncaught` is set otherwise — this includes plain errors *and* a `PrismaClientKnownRequestError`
 *   whose code did **not** match (so `uncaught` can still be a Prisma error; check its `.code` if needed).
 * Exactly one of the two is ever set.
 */
export interface CaughtInfo {
  caught: PrismaClientKnownRequestError | undefined;
  uncaught: unknown | undefined;
}

const classify = (code: PrismaErrorCode, e: unknown): CaughtInfo =>
  e instanceof PrismaClientKnownRequestError && codeMatches(code, e.code)
    ? { caught: e, uncaught: undefined }
    : { caught: undefined, uncaught: e };

/**
 * Like `handleKnownRequestError`, but never throws: it returns a neverthrow `Result`/`ResultAsync`
 * instead, and `errorMapper` is invoked for *every* failure (not just matching-code ones), receiving
 * a `CaughtInfo` so it can tell caught apart from uncaught.
 *
 * - On success, `ok(f())` is returned.
 * - On any thrown/rejected error, `err(errorMapper(info))` is returned.
 *
 * The return type follows `f`:
 * - `f` returns a promise (an `async` function or a Prisma query): a `ResultAsync<T, E>` is returned.
 * - `f` returns a plain value: a plain `Result<T, E>` is returned.
 *
 * @param code Code to treat as `caught`, or an array of codes, e.g. `'P2025'`.
 * @param f Function to call.
 * @param errorMapper Maps every failure to the error type `E`.
 */
export function handleKnownRequestErrorRes<T, E>(
  code: PrismaErrorCode,
  f: () => Promise<T>,
  errorMapper: (info: CaughtInfo) => E,
): ResultAsync<T, E>;
export function handleKnownRequestErrorRes<T, E>(
  code: PrismaErrorCode,
  f: () => T,
  errorMapper: (info: CaughtInfo) => E,
): Result<T, E>;
export function handleKnownRequestErrorRes(
  code: PrismaErrorCode,
  f: () => unknown,
  errorMapper: (info: CaughtInfo) => unknown,
): unknown {
  const handle = (e: unknown) => err(errorMapper(classify(code, e)));

  try {
    const result = f();

    if (isThenable(result)) {
      // Prisma queries are lazy thenables: nothing runs until `.then` is called, and they are not
      // guaranteed to be `instanceof Promise`. `Promise.resolve` adopts them and starts the query.
      const settled = Promise.resolve(result).then(
        (value) => ok(value),
        (e) => handle(e),
      );
      return new ResultAsync(settled);
    }

    return ok(result);
  } catch (e) {
    // `f` threw synchronously
    return handle(e);
  }
}
