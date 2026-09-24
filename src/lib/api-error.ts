// src/lib/api-error.ts

// ---- Payload phantom brand ----

declare const _payload: unique symbol;
type HasPayload<P> = { readonly [_payload]: P };

/**
 * Annotates a spec entry with a required payload type.
 * Without it, the code's payload defaults to `undefined` and is optional at call-sites.
 *
 * @example
 * defineErrors('user', {
 *   NOT_FOUND: withPayload<{ userId: string }>({ status: 404, message: 'User not found' }),
 *   RATE_LIMITED: { status: 429, message: 'Too many requests' },
 * });
 */
export function withPayload<P>(
  spec: { status: number; message: string },
): typeof spec & HasPayload<P> {
  return spec as typeof spec & HasPayload<P>;
}

// ---- Derive error-map from spec ----

type PayloadOf<E> = E extends HasPayload<infer P> ? P : undefined;
type ErrorMap<S>  = { [C in keyof S]: PayloadOf<S[C]> };

// ---- Public types ----

export type ApiErrCode<M>    = Extract<keyof M, string>;
export type ApiErrorModule<M> = { [C in ApiErrCode<M>]: ApiError<M, C> }[ApiErrCode<M>];

export type ApiError<M, C extends ApiErrCode<M> = ApiErrCode<M>> = {
  readonly status:  number;
  readonly message: string;
  readonly module:  string;
  readonly code:    C;
  readonly payload: M[C];
};

/** Extract the error-union type from a factory — useful for return-type annotations. */
export type InferError<F> = F extends ApiErrorFactory<infer M> ? ApiErrorModule<M> : never;

// ---- Per-call init ----

type ApiErrInit<M, C extends ApiErrCode<M>> =
  { message?: string; status?: number } &
  (undefined extends M[C] ? { payload?: M[C] } : { payload: M[C] });

type CreateArgs<M, C extends ApiErrCode<M>> =
  undefined extends M[C]
    ? [init?: ApiErrInit<M, C>]
    : [init:  ApiErrInit<M, C>];

// ---- Factory ----

export interface ApiErrorFactory<M> {
  readonly module: string;
  create<C extends ApiErrCode<M>>(code: C, ...args: CreateArgs<M, C>): ApiError<M, C>;
  is(err: unknown): err is ApiErrorModule<M>;
  is<C extends ApiErrCode<M>>(err: unknown, code: C): err is ApiError<M, C>;
}

// ---- defineErrors ----

type SpecEntry = { status: number; message: string };

export function defineErrors<S extends Record<string, SpecEntry>>(
  moduleName: string,
  spec: S,
): ApiErrorFactory<ErrorMap<S>> {
  type M = ErrorMap<S>;

  function create<C extends ApiErrCode<M>>(code: C, ...args: CreateArgs<M, C>): ApiError<M, C> {
    const init  = (args[0] ?? {}) as { message?: string; status?: number; payload?: M[C] };
    const entry = spec[code as string];
    return {
      status:  init.status  ?? entry?.status ?? 500,
      message: init.message ?? entry?.message ?? 'Internal server error',
      module:  moduleName,
      code,
      payload: init.payload as M[C],
    };
  }

  function is(err: unknown, code?: string): boolean {
    if (typeof err !== 'object' || err === null) return false;
    const e = err as Record<string, unknown>;
    return (
      typeof e['status']  === 'number' &&
      typeof e['message'] === 'string' &&
      e['module'] === moduleName &&
      (code === undefined || e['code'] === code)
    );
  }

  return { module: moduleName, create, is: is as ApiErrorFactory<M>['is'] };
}
