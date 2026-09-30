import type { Handler } from "express";
import z from "zod";
import type { IUserService } from "../service";
import { defineErrors, withPayload } from "../../../lib/api-error";
import { USERNAME_REGEX } from "../username";

const registerUserSchema = z.object({
  email: z.email(),
  password: z.string(),
  username: z.string().min(3).max(48).regex(USERNAME_REGEX),
  name: z.string().optional(),
});

const RegisterError = defineErrors("user::register", {
  INVALID_REQUEST_BODY: withPayload<{issues: any}>({ message: "Invalid request body", status: 400 }),
});

export const RegisterUserController =
  (userService: IUserService): Handler =>
  (req, res) => {
    const result = registerUserSchema.safeParse(req.body);
    if (!result.success) {
      const error = RegisterError.create("INVALID_REQUEST_BODY", {payload: {issues: result.error.issues}});
      return res.status(error.status).json(error);
    }
    const { email, password, username, name } = result.data;
    userService.register({ email, password, username, name: name ?? null }).match(
      (userDto) => {
        res.status(201).json(userDto);
      },
      (error) => {
        res.status(error.status).json(error);
      },
    );
  };
