import { makeErrorFactory, type ErrorModule } from "../../lib/error-module"

interface ISpaceErrors {
  SLUG_TAKEN: { slug: string };
  OWNER_NOT_FOUND: undefined;
  SPACE_NOT_FOUND: undefined;
  INVALID_HOME_POST: undefined;
  SERVICE_UNAVAILABLE: undefined;
  SERVICE_FAILURE: undefined;
}

export type SpaceError = ErrorModule<ISpaceErrors>;

export const SpaceError = makeErrorFactory<SpaceError>('space', {
  SLUG_TAKEN:          { message: 'Slug already in use',  status: 409 },
  OWNER_NOT_FOUND:     { message: 'Owner not found',      status: 404 },
  SPACE_NOT_FOUND:     { message: 'Space not found',      status: 404 },
  INVALID_HOME_POST:   { message: 'Can not set the home post to this post',    status: 400 },
  SERVICE_UNAVAILABLE: { message: 'Service unavailable',  status: 503 },
  SERVICE_FAILURE:     { message: 'Internal error',       status: 500 },
});
