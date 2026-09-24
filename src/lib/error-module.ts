/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Three pieces per module:
 *
 *   interface AuthErrors { FOO: { reason: string }; BAR: undefined }     // shape: code -> payload
 *   export type AuthError = ErrorModule<AuthErrors>;                      // set of defined errors
 *   export const AuthError = makeErrorFactory<AuthError>('auth', {...});  // methods on errors
 */

/** Defined codes for module error type M. */
export type ErrCode<M> = Extract<keyof M, string>;

/** Per-instance options. `payload` is required iff the code's payload type isn't `undefined`. */
export type ErrInit<M, C extends ErrCode<M>> = {
  message?: string;
  cause?: unknown;
  status?: number;
} & (undefined extends M[C] ? { payload?: M[C] } : { payload: M[C] });


type CreateArgs<M, C extends ErrCode<M>> = undefined extends M[C]
  ? [init?: ErrInit<M, C>]
  : [init: ErrInit<M, C>];

/** The Error subclass behind every module error. `cause` is inherited from Error (ES2022). */
export class AppError<M = any, C extends ErrCode<M> = ErrCode<M>> extends Error {
  readonly payload: M[C];
  readonly status: number;

  constructor(
    readonly module: string,
    readonly code: C,
    message: string,
    init: { payload?: M[C]; cause?: unknown; status?: number } = {},
  ) {
    super(message, init.cause !== undefined ? { cause: init.cause } : undefined);
    this.name = 'AppError';
    this.payload = init.payload as M[C];
    this.status = init.status ?? 500;
  }

  toJSON(): {
    module: string;
    code: C;
    message: string;
    status: number;
    payload: M[C];
    cause?: unknown;
  } {
    return {
      status: this.status,
      message: this.message,
      module: this.module,
      code: this.code,
      payload: this.payload,
      ...(isDevelopment() ? { cause: serializeCause(this.cause) } : {}),
    };
  }
}

function isDevelopment(): boolean {
  return process.env.NODE_ENV !== 'production';
}

function serializeCause(cause: unknown): unknown {
  if (cause instanceof AppError) return cause.toJSON();
  if (cause instanceof Error) {
    return { name: cause.name, message: cause.message, stack: cause.stack };
  }
  return cause;
}

/**
 * The set of defined errors for M: a union of `AppError<M, C>`, one per code,
 * so `switch (err.code)` narrows `err.payload`.
 */
export type ErrorModule<M> = { [C in ErrCode<M>]: AppError<M, C> }[ErrCode<M>];

/** Recovers M from `ErrorModule<M>`. */
export type ModuleOf<E> = E extends AppError<infer M, any> ? M : never;

/** Default message per code. Every code in M must be registered. */
export type ErrorSpec<M> = { [C in ErrCode<M>]: { message?: string, status?: number } };

export interface ErrorFactory<M> {
  readonly name: string;
  create<C extends ErrCode<M>>(code: C, ...args: CreateArgs<M, C>): AppError<M, C>;
  /** Was `err` produced by this module? */
  is(err: unknown): err is ErrorModule<M>;
  /** ...and does it have this code? */
  is<C extends ErrCode<M>>(err: unknown, code: C): err is AppError<M, C>;
}

/**
 * `E` is the module's error type (e.g. `AuthError`); `spec` gives each code a default message.
 * Message falls back to the code itself when omitted.
 */
export function makeErrorFactory<E extends AppError<any, any>>(
  name: string,
  spec: ErrorSpec<ModuleOf<E>>,
): ErrorFactory<ModuleOf<E>> {
  return build<ModuleOf<E>>(name, spec);
}

function build<M>(name: string, spec: ErrorSpec<M>): ErrorFactory<M> {
  function create<C extends ErrCode<M>>(code: C, ...args: CreateArgs<M, C>): AppError<M, C> {
    const init = (args[0] ?? {}) as { message?: string; cause?: unknown; payload?: M[C], status?: number };
    return new AppError<M, C>(name, code, init.message ?? spec[code].message ?? code, {
      ...init,
      status: init.status ?? spec[code]?.status,
    });
  }

  function is(err: unknown, code?: string): boolean {
    return (
      err instanceof AppError &&
      err.module === name &&
      (code === undefined || err.code === code)
    );
  }

  return { name, create, is: is as ErrorFactory<M>['is'] };
}
