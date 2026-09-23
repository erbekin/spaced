import { errAsync, ok, okAsync, ResultAsync } from "neverthrow";
import { UserError } from "./errors";
import { RefreshToken } from "../../lib/jwt";
import { UserRepositoryErrorCode, type IUserRepository } from "./repository-interface";
import type { ISessionService } from "../auth/session/service";
import type { IPasswordHasher } from "../auth/password-hasher";
import { config } from "../config";

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

export type LoggedInUser = {
  refreshToken: string;
  user: UserDto;
};

export interface IUserService {
  register(dto: RegisterUserDto): ResultAsync<UserDto, UserError>;
  login(dto: LoginDto): ResultAsync<LoggedInUser, UserError>;
  logout(refreshToken: string): ResultAsync<void, UserError>;
  list(): ResultAsync<UserDto[], UserError>;
  get(userId: string): ResultAsync<UserDto, UserError>;
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
  ) {}

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
              switch (e.type) {
                case UserRepositoryErrorCode.UniqueViolation:
                  return UserError.create("USER_ALREADY_EXISTS", {
                    message: "Username or email already exists",
                  });
                case UserRepositoryErrorCode.Other:
                  return UserError.create("STORAGE_FAILURE", { cause: e.cause });
              }
            }); // repository error -> UserError
        })
    );
  }

  login(dto: LoginDto): ResultAsync<LoggedInUser, UserError> {
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
          return this.sessionService
            // session expires when the refresh token expires
            .create(user.id, { expiresIn: config.jwt.refreshToken.expiration })
            .map((s) => ({ session: s, user }))
            .mapErr((e) => UserError.create("SERVICE_FAILURE", { cause: e, payload: { name: e.name } }));
        })
        // sign session token
        .andThen(({ session, user }) => {
          return RefreshToken.create({ sessionId: session.sessionId })
            .mapErr((e) => UserError.create("TOKEN_FAILURE", { cause: e }))
            .map((t) => ({ refreshToken: t, user: mapUserToDto(user) }));
        })
        .andThen((loggedInUser) => {
          return ok(loggedInUser);
        })
    );
  }

  logout(refreshToken: string): ResultAsync<void, UserError> {
    return this.sessionService
      .revoke(refreshToken)
      .mapErr((e) => UserError.create("SERVICE_FAILURE", { cause: e, payload: { name: e.name } }))
      .map(() => undefined);
  }

  list(): ResultAsync<UserDto[], UserError> {
    return fromRepo(this.userRepo.selectAll()).map((users) => users.map(mapUserToDto));
  }

  get(userId: string): ResultAsync<UserDto, UserError> {
    return fromRepo(this.userRepo.selectById(userId))
      .andThen((user) => user.caseOf({
        Nothing: () => errAsync(UserError.create('USER_NOT_FOUND')),
        Just: (user) => okAsync(mapUserToDto(user)),
      }))
  }
}
