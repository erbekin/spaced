import { makeErrorFactory, type ErrorModule } from "../../lib/error-module"

type SubscriptionErrorModuleDef = {
  USER_OR_SPACE_NOT_FOUND: undefined,
  CONFLICT_STATE: undefined,
  SERVICE_FAILURE: undefined,
}

export type SubscriptionError = ErrorModule<SubscriptionErrorModuleDef>;

export const SubscriptionError = makeErrorFactory<SubscriptionError>('subscription', {
  USER_OR_SPACE_NOT_FOUND: {message: 'user or space not found', status: 404},
  SERVICE_FAILURE: {message: 'service failure'},
  CONFLICT_STATE: {message: 'conflict state', status: 409},
})
