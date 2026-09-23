import type { Handler } from "express";
import z from "zod";
import type { IUserService } from "../service";

const registerUserSchema = z.object({
  email: z.email(),
  password: z.string(),
  username: z.string(),
  name: z.string().optional(),
});

export const RegisterUserController =
  (userService: IUserService): Handler =>
    (req, res) => {
    const result = registerUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: {message: 'Invalid request body', issues: result.error.issues}
      });
    }
    const { email, password, username, name } = result.data;
    userService.register({ email, password, username, name: name ?? null }).match((userDto) => {
      res.status(201).json(userDto);
    }, (error) => {
      res.status(error.status ?? 500).json({error: error.toJSON()});
    })
  };
