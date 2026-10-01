import { type Application } from "express";

// username.ts
export const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 48;

export const normalizeUsername = (raw: string) => raw.trim().toLowerCase();

export function isValidUsername(u: string): boolean {
  return u.length >= USERNAME_MIN_LENGTH && u.length <= USERNAME_MAX_LENGTH && USERNAME_REGEX.test(u);
}

export function applyUsernameExpressHook(app: Application) {
  app.param("username", (req, res, next, username) => {
    req.params.username = normalizeUsername(username);
    next();
  });
}
