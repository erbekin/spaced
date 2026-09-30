import type { ResultAsync } from "neverthrow";
import { SpaceError } from "./errors";
import type { ISpaceRepository } from "./repository-interface";


export type SpaceEntity = {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
    homePostId: string | null;
}

export type CreateSpaceDto = {
    name: string;
    slug: string;
    ownerId: string;
}

export interface ISpaceService {
  /** Creates a new space */
  create(dto: CreateSpaceDto): ResultAsync<SpaceEntity, SpaceError>;
  /** Lists all spaces owned by the given user */
  list(username: string): ResultAsync<SpaceEntity[], SpaceError>;
}


//==================== Service Implementation ====================/
export class SpaceService implements ISpaceService {
  constructor(private readonly repository: ISpaceRepository) {

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
  list(username: string): ResultAsync<SpaceEntity[], SpaceError> {
    return this.repository.selectAll({ mode: 'username', value: username })
      .mapErr((error) => SpaceError.create('SERVICE_FAILURE', {cause: error}))
  }

}
