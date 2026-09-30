import { makeErrorFactory, type ErrorModule } from "../../lib/error-module"

interface ISpaceErrors {
  SLUG_TAKEN: { slug: string };
  OWNER_NOT_FOUND: undefined;
  SERVICE_UNAVAILABLE: undefined;
  SERVICE_FAILURE: undefined;
}

export type SpaceError = ErrorModule<ISpaceErrors>;

export const SpaceError = makeErrorFactory<SpaceError>('space', {
  SLUG_TAKEN:          { message: 'Slug already in use',  status: 409 },
  OWNER_NOT_FOUND:     { message: 'Owner not found',      status: 401 },
  SERVICE_UNAVAILABLE: { message: 'Service unavailable',  status: 503 },
  SERVICE_FAILURE:     { message: 'Internal error',       status: 500 },
});
