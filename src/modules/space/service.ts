import type { ResultAsync } from "neverthrow";
import { SpaceError } from "./errors";
import type { ISpaceRepository } from "./repository-interface";
import type { IUserService } from "../user/service";
import type { Page, PageArgs } from "../../lib/pagination";


export type SpaceEntity = {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
    homePostId: string | null;
}

export type SpaceEntityWithOwner = SpaceEntity & {
    owner: {
        id: string;
        username: string;
        name: string | null;
    };
}

export type CreateSpaceDto = {
    name: string;
    slug: string;
    ownerId: string;
}
export type UpdateSpaceDto = {
  name?: string;
  slug?: string;
  /** null to remove the home post */
  homePostId?: string | null;
}

export interface ISpaceService {
  /** Creates a new space */
  create(dto: CreateSpaceDto): ResultAsync<SpaceEntity, SpaceError>;
  /** Lists all spaces owned by the given user */
  list(username: string, page: PageArgs): ResultAsync<Page<SpaceEntity>, SpaceError>;
  get(username: string, spaceSlug: string): ResultAsync<SpaceEntityWithOwner, SpaceError>;
  update(username: string, spaceSlug: string, dto: UpdateSpaceDto): ResultAsync<SpaceEntity, SpaceError>;
  delete(username: string, spaceSlug: string): ResultAsync<void, SpaceError>;
}


//==================== Service Implementation ====================/
export class SpaceService implements ISpaceService {
  constructor(private readonly repository: ISpaceRepository, private readonly userService: IUserService) {

  }
  delete(username: string, spaceSlug: string): ResultAsync<void, SpaceError> {
    return this.userService.getByUsername(username)
      .mapErr((error) => SpaceError.create('OWNER_NOT_FOUND', { cause: error }))
      .map((user) => user.id)
      .andThen((userId) => {
        return this.repository.delete(userId, spaceSlug);
      })
      .mapErr((error) => {
        if (error.code === 'NotFoundError') {
          return SpaceError.create('SPACE_NOT_FOUND', { cause: error});
        }
        return SpaceError.create('SERVICE_FAILURE', { cause: error });
      })
  }
  update(username: string, spaceSlug: string, dto: UpdateSpaceDto): ResultAsync<SpaceEntity, SpaceError> {
    return this.userService.getByUsername(username)
      .mapErr((error) => SpaceError.create('OWNER_NOT_FOUND', { cause: error }))
      .map((user) => user.id)
      .andThen((userId) => {
        return this.repository.update(userId, spaceSlug, dto);
      })
      .mapErr((error) => {
        if (error.code === 'UniqueViolationError') {
          return SpaceError.create('SLUG_TAKEN', { cause: error, payload: {slug: spaceSlug} });
        }
        if (error.code === 'NotFoundError') {
          return SpaceError.create('SPACE_NOT_FOUND', { cause: error });
        }
        return SpaceError.create('SERVICE_FAILURE', { cause: error });
      })
  }
  get(username: string, spaceSlug: string): ResultAsync<SpaceEntityWithOwner, SpaceError> {
    return this.userService.getByUsername(username)
      .mapErr((error) => SpaceError.create('OWNER_NOT_FOUND', { cause: error }))
      .map((user) => user.id)
      .andThen((userId) => {
        return this.repository.selectOne(spaceSlug, userId).mapErr((error) => {
          if (error.code === 'NotFoundError') {
            return SpaceError.create('SPACE_NOT_FOUND', { cause: error });
          }
          return SpaceError.create('SERVICE_FAILURE', { cause: error });
        });
      })

  }
  create(dto: CreateSpaceDto) {
    return this.repository
      .insert(dto)
      .mapErr((e) => {
        switch (e.code) {
          case 'UniqueViolationError':
            return SpaceError.create('SLUG_TAKEN', { payload: { slug: dto.slug }, cause: e });
          case 'ForeignKeyViolationError':
            return SpaceError.create('OWNER_NOT_FOUND', { cause: e });
          case 'UnavailableError':
            return SpaceError.create('SERVICE_UNAVAILABLE', { cause: e });
          default:
            return SpaceError.create('SERVICE_FAILURE', { cause: e });
        }
      });
  }
  list(username: string, page: PageArgs): ResultAsync<Page<SpaceEntity>, SpaceError> {
    return this.userService.getByUsername(username)
      .mapErr((error) => {
        if (error.code === 'USER_NOT_FOUND') {
          return SpaceError.create('OWNER_NOT_FOUND', {cause: error});
        }
        return SpaceError.create('SERVICE_FAILURE', {cause: error});
      })
      .andThen(() => {
        return this.repository.selectAll({ mode: 'username', value: username }, page)
          .mapErr((error) => SpaceError.create('SERVICE_FAILURE', {cause: error}));
      });
  }

}
