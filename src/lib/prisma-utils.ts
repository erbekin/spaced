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

export type CaughtInfo =
  | { status: 'caught-known'; error: PrismaClientKnownRequestError }
  | { status: 'uncaught-known'; error: PrismaClientKnownRequestError }
  | { status: 'uncaught-unknown'; error: unknown };

const classify = (code: PrismaErrorCode, e: unknown): CaughtInfo =>
  e instanceof PrismaClientKnownRequestError && codeMatches(code, e.code)
    ? { status: 'caught-known', error: e }
    : e instanceof PrismaClientKnownRequestError
      ? { status: 'uncaught-known', error: e }
      : { status: 'uncaught-unknown', error: e };

/**
 * Prisma sorgusunu veya fonksiyonu çalıştırır; sonucu `Result<T, CaughtInfo>`
 * veya `ResultAsync<T, CaughtInfo>` içine sarar.
 *
 * @param code 'caught-known' olarak sınıflandırılacak Prisma hata kodu veya kod listesi (örn: 'P2002', 'P2025').
 * @param f Çalıştırılacak fonksiyon veya Prisma sorgusu.
 */
export function handleKnownRequestErrorRes<T>(
  code: PrismaErrorCode,
  f: () => Promise<T>,
): ResultAsync<T, CaughtInfo>;
export function handleKnownRequestErrorRes<T>(
  code: PrismaErrorCode,
  f: () => T,
): Result<T, CaughtInfo>;
export function handleKnownRequestErrorRes(
  code: PrismaErrorCode,
  f: () => unknown,
): unknown {
  const handle = (e: unknown) => err(classify(code, e));

  try {
    const result = f();

    if (isThenable(result)) {
      // Prisma lazy thenable yapılarını standart Promise zincirine alır
      const settled = Promise.resolve(result).then(
        (value) => ok(value),
        (e) => handle(e),
      );
      return new ResultAsync(settled);
    }

    return ok(result);
  } catch (e) {
    return handle(e);
  }
}
