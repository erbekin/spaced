import { ResultAsync } from "neverthrow";
import { SubscriptionError } from "./errors";
import { prisma } from "../../lib/prisma";
import { handleKnownRequestErrorRes } from "../../lib/prisma-utils";
export type Subscription = {
  id: string;
  userId: string;
  spaceId: string;
};

export interface ISubscriptionService {
  /** Subscribe user to a space. */
  subscribe(userId: string, spaceId: string): ResultAsync<Subscription, SubscriptionError>;
  /** Unsubscribe user from a space. */
  unsubscribe(userId: string, spaceId: string): ResultAsync<void, SubscriptionError>;
  /** Get all subscriptions for a user.
   * Note: if user is not found, returns an empty array.
   * So, empty array means two things: user is not found or user has no subscriptions.
   */
  getSubscriptions(userId: string): ResultAsync<Subscription[], SubscriptionError>;
  /** Get all subscribers for a space.
   * Note: if space is not found, returns an empty array.
   * So, empty array means two things: space is not found or space has no subscribers.
   */
  getSubscribers(spaceId: string): ResultAsync<Subscription[], SubscriptionError>;
}

//========== Implementation =================================================/

export class SubscriptionService implements ISubscriptionService {
  constructor() {}
  subscribe(userId: string, spaceId: string): ResultAsync<Subscription, SubscriptionError> {
    return ResultAsync.fromPromise(
      prisma.subscription.create({
        data: {
          userId,
          spaceId,
        },
        select: {
          id: true,
          userId: true,
          spaceId: true,
        },
      }),
      (error: unknown) => SubscriptionError.create("SERVICE_FAILURE", { cause: error }),
    );
  }
  unsubscribe(userId: string, spaceId: string): ResultAsync<void, SubscriptionError> {
    const res = handleKnownRequestErrorRes("2025", () => {
      return prisma.subscription.delete({
        where: {
          userId_spaceId: {
            userId,
            spaceId,
          },
        },
      });
    }).mapErr((errInfo) => {
      switch (errInfo.status) {
        case "caught-known":
          if (errInfo.error.code === "2025") return SubscriptionError.create("USER_OR_SPACE_NOT_FOUND");
          else return SubscriptionError.create("SERVICE_FAILURE", { cause: errInfo.error });
        case "uncaught-known":
        case "uncaught-unknown":
          return SubscriptionError.create("SERVICE_FAILURE", { cause: errInfo.error });
      }
    });
    return res.map(() => undefined);
  }
  getSubscriptions(userId: string): ResultAsync<Subscription[], SubscriptionError> {
    return ResultAsync.fromPromise(
      prisma.subscription.findMany({
        where: {
          userId,
        },
      }),
      (error: unknown) => SubscriptionError.create("SERVICE_FAILURE", { cause: error }),
    );
  }
  getSubscribers(spaceId: string): ResultAsync<Subscription[], SubscriptionError> {
    return ResultAsync.fromPromise(
      prisma.subscription.findMany({
        where: {
          spaceId,
        },
      }),
      (error: unknown) => SubscriptionError.create("SERVICE_FAILURE", { cause: error }),
    );
  }
}
