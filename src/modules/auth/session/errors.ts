import { type ErrorModule, makeErrorFactory } from '../../../lib/error-module';

export interface SessionErrors {
  INVALID_EXPIRY: { expiresIn: string };
  NOT_FOUND: undefined;
  USER_NOT_FOUND: undefined;
  STORAGE_FAILURE: undefined;
  SERVICE_FAILURE: undefined;
}

export type SessionError = ErrorModule<SessionErrors>;

export const SessionError = makeErrorFactory<SessionError>('auth::session', {
  INVALID_EXPIRY: { message: 'Invalid session expiry', status: 400 },
  NOT_FOUND: { message: 'Session not found', status: 404 },
  USER_NOT_FOUND: { message: 'User not found', status: 404 },
  STORAGE_FAILURE: { message: 'Session storage failure' },
  SERVICE_FAILURE: { message: 'Service failure' },
});
