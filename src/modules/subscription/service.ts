import { errAsync, ResultAsync, safeTry } from "neverthrow";
import { SubscriptionError } from "./errors";
import { prisma } from "../../lib/prisma";
import { handleKnownRequestErrorRes } from "../../lib/prisma-utils";
import type { ISpaceService } from "../space/service";
import type { IUserService } from "../user/service";
export type Subscription = {
  id: string;
  userId: string;
  spaceId: string;
};

export type SubscriptionDetail = {
  id: string;
  user: {
    id: string;
    username: string;
    name: string | null;
  };
  space: {
    id: string;
    slug: string;
    name: string;
    owner: {
      id: string;
      username: string;
      name: string | null;
    };
  };
};


export interface ISubscriptionService {
  /** Subscribe user to a space. */
  subscribe(userId: string, spaceId: string): ResultAsync<Subscription, SubscriptionError>;
  /** Unsubscribe user from a space. */
  unsubscribe(userId: string, spaceId: string): ResultAsync<void, SubscriptionError>;
  /** Get all subscriptions for a user.
   * Note: if user is not found, returns error with code 'USER_OR_SPACE_NOT_FOUND'.
   */
  getSubscriptions(userId: string): ResultAsync<Subscription[], SubscriptionError>;
  /** Get all subscribers for a space.
   * Note: if space is not found, returns error with code 'USER_OR_SPACE_NOT_FOUND'.
   */
  getSubscribers(spaceId: string): ResultAsync<Subscription[], SubscriptionError>;

  /** Get details of subscriptions by their IDs. */
  getDetails(ids: string[]): ResultAsync<SubscriptionDetail[], SubscriptionError>;
}

//========== Implementation =================================================/

export class SubscriptionService implements ISubscriptionService {
  constructor(private readonly spaceService: ISpaceService,
    private readonly userService : IUserService) { }
  subscribe(userId: string, spaceId: string): ResultAsync<Subscription, SubscriptionError> {
    console.log("subscribe", userId, spaceId)
    const _this = this;
    return safeTry(async function* () {
      // get user
      const user = yield* _this.userService.getById(userId);
      // check space
      const spaceExists = yield* _this.spaceService.checkSpace(user.id, spaceId);
      // user cant subscribe to a space they own
      if (spaceExists) return errAsync(SubscriptionError.create('FORBIDDEN'));
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
    }).mapErr((error) => {
      if (SubscriptionError.is(error)) return error;
      return SubscriptionError.create("SERVICE_FAILURE", { cause: error });
    });
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
    // ensure user exists
    return this.userService.getById(userId)
      .andThen((user) => {
        return ResultAsync.fromPromise(
          prisma.subscription.findMany({
            where: {
              userId,
            },
          }),
          (error: unknown) => SubscriptionError.create("SERVICE_FAILURE", { cause: error }),
        );
      })
      .mapErr((err) => SubscriptionError.create("USER_OR_SPACE_NOT_FOUND", { cause: err }));

  }
  getSubscribers(spaceId: string): ResultAsync<Subscription[], SubscriptionError> {
    // ensure space exists
    return this.spaceService.countById(spaceId)
      .andThen((count) => {
        if (count === 0) return errAsync(SubscriptionError.create("USER_OR_SPACE_NOT_FOUND"));
        return ResultAsync.fromPromise(
          prisma.subscription.findMany({
            where: {
              spaceId,
            },
          }),
          (error: unknown) => SubscriptionError.create("SERVICE_FAILURE", { cause: error }),
        );
      })
      .mapErr((err) => SubscriptionError.create("USER_OR_SPACE_NOT_FOUND", { cause: err }));
  }
  getDetails(ids: string[]): ResultAsync<SubscriptionDetail[], SubscriptionError> {
    return ResultAsync.fromPromise(
      prisma.subscription.findMany({
        where: {
          id: {
            in: ids,
          },
        },
        select: {
          id: true,
          user: {
            select: {
              id: true,
              username: true,
              name: true,
            }
          },
          space: {
            select: {
              id: true,
              slug: true,
              name: true,
              owner: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                }
              },
            }
          },
        }
      }),
      (error: unknown) => SubscriptionError.create("SERVICE_FAILURE", { cause: error }),
    );
  }
}
