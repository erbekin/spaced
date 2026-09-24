import { type ErrorModule, makeErrorFactory } from '../../../lib/error-module';

export interface SessionErrors {
  INVALID_EXPIRY: { expiresIn: string };
  NOT_FOUND: undefined;
  USER_NOT_FOUND: undefined;
  INVALID_TOKEN: undefined;
  STORAGE_FAILURE: undefined;
}

export type SessionError = ErrorModule<SessionErrors>;

export const SessionError = makeErrorFactory<SessionError>('Session', {
  INVALID_EXPIRY: { message: 'Invalid session expiry' },
  NOT_FOUND: { message: 'Session not found' },
  USER_NOT_FOUND: { message: 'User not found' },
  INVALID_TOKEN: { message: 'Invalid token' },
  STORAGE_FAILURE: { message: 'Session storage failure' },
});
