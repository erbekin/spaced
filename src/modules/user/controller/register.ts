import type { Handler } from "express";
import z from "zod";
import type { IUserService } from "../service";
import { defineErrors } from "../../../lib/api-error";

const registerUserSchema = z.object({
  email: z.email(),
  password: z.string(),
  username: z.string(),
  name: z.string().optional(),
});

const RegisterError = defineErrors("user::register", {
  INVALID_REQUEST_BODY: { message: "Invalid request body", status: 400 },
});

export const RegisterUserController =
  (userService: IUserService): Handler =>
  (req, res) => {
    const result = registerUserSchema.safeParse(req.body);
    if (!result.success) {
      const error = RegisterError.create("INVALID_REQUEST_BODY");
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
