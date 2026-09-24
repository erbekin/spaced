import { AppError, type ErrorModule, makeErrorFactory } from '../../lib/error-module';

export interface UserErrors {
  STORAGE_FAILURE: undefined;
  USER_ALREADY_EXISTS: undefined;
  USER_NOT_FOUND: undefined;
  TOKEN_FAILURE: undefined;
  INVALID_CREDENTIALS: undefined;
  PASSWORD_FAILURE: undefined;
  SERVICE_FAILURE: {
    name: string;
  };
}

export type UserError = ErrorModule<UserErrors>;

export const UserError = makeErrorFactory<UserError>('user', {
  STORAGE_FAILURE: {message: 'Storage failure', status: 500},
  USER_ALREADY_EXISTS: {message: 'User already exists', status: 409},
  USER_NOT_FOUND: {message: 'User not found', status: 404},
  TOKEN_FAILURE: {message: 'Token failure', status: 401},
  INVALID_CREDENTIALS: {message: 'Invalid credentials', status: 401},
  PASSWORD_FAILURE: {message: 'Password hash failure', status: 500},
  SERVICE_FAILURE: {message: 'Service failure', status: 500},
});
