import { errAsync, ok, okAsync, ResultAsync, safeTry } from "neverthrow";
import { UserError } from "./errors";
import { UserRepositoryErrorCode, type IUserRepository } from "./repository-interface";
import type { ISessionService, SessionEntity } from "../auth/session/service";
import type { IPasswordHasher } from "../auth/password-hasher";
import { config } from "../config";
import { TokenType, type ITokenService } from "../auth/token/service";
import type { AppError } from "../../lib/error-module";
import type { Page, PageArgs } from "../../lib/pagination";
import type { get } from "node:http";

export type UserEntity = {
  id: string;
  username: string;
  email: string;
  name: string | null;
  passwordHash: string;
  createdAt: Date;
};
export type UserDto = {
  id: string;
  username: string;
  email: string;
  name: string | null;
  createdAt: Date;
};

export function mapUserToDto(user: UserEntity): UserDto {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

export type RegisterUserDto = {
  username: string;
  email: string;
  name: string | null;
  password: string;
};

export type LoginDto = {
  username: string;
  password: string;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type LoggedInUserDto = {
  tokens: TokenPair;
  user: UserDto;
};

export type UserNameDto = {
  id: string;
  username: string;
  name: string | null;
};

export type HomePostEntity = {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
};

export type HomePostDto = {
  homePost: {
    content: string;
    createdAt: Date;
  } | null
};

export type HomePostUpdateDto = {
  content: string;
};


export interface IUserService {
  register(dto: RegisterUserDto): ResultAsync<UserDto, UserError>;
  login(dto: LoginDto): ResultAsync<LoggedInUserDto, UserError>;
  logout(refreshToken: string): ResultAsync<void, AppError>;
  list(page: PageArgs): ResultAsync<Page<UserNameDto>, UserError>;
  getById(userId: string): ResultAsync<UserDto, UserError>;
  getByUsername(username: string): ResultAsync<UserDto, UserError>;
  refresh(refreshToken: string): ResultAsync<TokenPair, UserError>;
  getHomePost(userId: string): ResultAsync<HomePostDto, UserError>;
  setHomePost(userId: string, dto: HomePostUpdateDto): ResultAsync<void, UserError>;
}

//================= The user service implementation ==========/

const fromRepo = <T, E>(result: ResultAsync<T, E>) =>
  result.mapErr((cause) => {
    // log the cause
    console.error("fromRepo error", cause);
    return UserError.create("STORAGE_FAILURE");
  });

export class UserService implements IUserService {
  constructor(
    private readonly sessionService: ISessionService,
    private readonly userRepo: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
  ) {}

  //============== Private methods ===================/
  private hashPassword(password: string): ResultAsync<string, UserError> {
    return ResultAsync.fromPromise(this.passwordHasher.hash(password), (e) =>
      UserError.create("PASSWORD_FAILURE", { cause: e }),
    );
  }
  private verifyPassword(password: string, passwordHash: string): ResultAsync<boolean, UserError> {
    return ResultAsync.fromPromise(this.passwordHasher.verify(password, passwordHash), (e) =>
      UserError.create("PASSWORD_FAILURE", { message: "Password verification failed", cause: e }),
    );
  }

  /** Signs the tokens for the given user and session. */
  private signTokens(
    user: { id: string; username: string },
    session: { sessionId: string },
  ): ResultAsync<TokenPair, UserError> {
    const accessToken = this.tokenService.create({
      type: TokenType.Access,
      userId: user.id,
      username: user.username,
    });
    const refreshToken = this.tokenService.create({
      type: TokenType.Refresh,
      sessionId: session.sessionId,
    });
    return ResultAsync.combine([accessToken, refreshToken])
      .map(([accessToken, refreshToken]) => ({ accessToken, refreshToken }))
      .mapErr((error) => UserError.create("SERVICE_FAILURE", { cause: error }));
  }

  //================= Public methods ===================/
  register(dto: RegisterUserDto): ResultAsync<UserDto, UserError> {
    // Check if the user already exists
    return (
      // hash the password
      this.hashPassword(dto.password)
        // and then,  insert the user
        .andThen((passwordHash) => {
          return this.userRepo
            .insert({
              username: dto.username,
              email: dto.email,
              name: dto.name,
              passwordHash,
            })
            .map(mapUserToDto) // to DTO
            .mapErr((e) => {
              switch (e.code) {
                case UserRepositoryErrorCode.UniqueViolation:
                  return UserError.create("USER_ALREADY_EXISTS", {
                    message: "Username or email already exists",
                  });
                case UserRepositoryErrorCode.ForeignKeyViolation:
                case UserRepositoryErrorCode.Unknown:
                  return UserError.create("STORAGE_FAILURE", { cause: e.cause });
              }
            }); // repository error -> UserError
        })
    );
  }

  login(dto: LoginDto): ResultAsync<LoggedInUserDto, UserError> {
    return (
      // query the user by username
      fromRepo(this.userRepo.selectByUsername(dto.username))
        .andThen((u) =>
          u.caseOf({
            Just: (user) => okAsync(user),
            Nothing: () => errAsync(UserError.create("USER_NOT_FOUND")),
          }),
        )
        // verify the password
        .andThen((user) =>
          this.verifyPassword(dto.password, user.passwordHash).andThen((isValid) => {
            if (!isValid) return errAsync(UserError.create("INVALID_CREDENTIALS"));
            return ok(user);
          }),
        )
        // create the session
        .andThen((user) => {
          return (
            this.sessionService
              // session expires when the refresh token expires
              .findActiveOrCreate(user.id, { expiresIn: config.jwt.refreshToken.expiration })
              .map((s) => ({ session: s, user }))
              .mapErr((e) => UserError.create("SERVICE_FAILURE", { cause: e }))
          );
        })
        // sign session token
        .andThen(({ session, user }) =>
          this.signTokens(user, session).map((tokens) => ({ tokens, user: mapUserToDto(user) })),
        )
    );
  }

  logout(refreshToken: string): ResultAsync<void, UserError> {
    const thisService = this;
    return safeTry(async function* () {
      const session = yield* thisService.sessionService
        .decode(refreshToken)
        .mapErr((e) => UserError.create("SERVICE_FAILURE", { cause: e }));
      return thisService.sessionService
        .revoke(session.sessionId)
        .mapErr((e) => UserError.create("SERVICE_FAILURE", { cause: e }));
    });
  }

  list(page: PageArgs): ResultAsync<Page<UserDto>, UserError> {
    return fromRepo(this.userRepo.selectAll(page)).map(({items, nextCursor}) => ({
      items: items.map(mapUserToDto),
      nextCursor,
    }));
  }

  getById(userId: string): ResultAsync<UserDto, UserError> {
    return fromRepo(this.userRepo.selectById(userId)).andThen((user) =>
      user.caseOf({
        Nothing: () => errAsync(UserError.create("USER_NOT_FOUND")),
        Just: (user) => okAsync(mapUserToDto(user)),
      }),
    );
  }

  getByUsername(username: string): ResultAsync<UserDto, UserError> {
    return fromRepo(this.userRepo.selectByUsername(username)).andThen((user) =>
      user.caseOf({
        Nothing: () => errAsync(UserError.create("USER_NOT_FOUND")),
        Just: (user) => okAsync(mapUserToDto(user)),
      }),
    );
  }

  refresh(refreshToken: string): ResultAsync<TokenPair, UserError> {
    const this_ = this;
    return safeTry(async function* () {
      const session = yield* this_.sessionService
        .decode(refreshToken)
        .mapErr((error) => UserError.create("TOKEN_FAILURE", { cause: error }));
      const newSession = yield* this_.sessionService
        .rotate(session, { expiresIn: config.jwt.refreshToken.expiration })
        .mapErr((error) =>
          UserError.create("SERVICE_FAILURE", { message: "failed to create new session", cause: error }),
        );
      const user = yield* this_.getById(session.userId);
      const tokens = yield* this_.signTokens(user, newSession);
      return okAsync(tokens);
    });
  }
  getHomePost(userId: string): ResultAsync<HomePostDto, UserError> {
    return fromRepo(this.userRepo.selectHomePost(userId)).map((homePost) => ({
      homePost: homePost.map((post) => ({
        content: post.content,
        createdAt: post.createdAt,
      })).extractNullable(),
    }));
  }
  setHomePost(userId: string, dto: HomePostUpdateDto): ResultAsync<void, UserError> {
    return this.userRepo.upsertHomePost(userId, dto)
      .mapErr((error) => {
        switch (error.code) {
          case UserRepositoryErrorCode.ForeignKeyViolation:
            return UserError.create('USER_NOT_FOUND', { cause: error.cause, status: 400 });
          default:
            return UserError.create('SERVICE_FAILURE', { cause: error });
        }
      })
  }
}
