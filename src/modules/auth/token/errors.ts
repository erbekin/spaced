import { type ErrorModule, makeErrorFactory } from '../../../lib/error-module';

export interface TokenErrors {
  INVALID_FORMAT: undefined;
  EXPIRED: { expiredAt: Date };
  OTHER: undefined;
}

export type TokenError = ErrorModule<TokenErrors>;

export const TokenError = makeErrorFactory<TokenError>('token', {
  INVALID_FORMAT: { message: 'Invalid token format', status: 400 },
  EXPIRED: { message: 'Token expired', status: 401 },
  OTHER: { message: 'Unidentified token error', status: 500 },
});
