import type { Handler } from "express";
import type { IUserService } from "../service";

export const ListUsersController =
  (userService: IUserService): Handler =>
  (req, res) => {
    console.log("ListUsersController");
    userService.list().match(
      (list) => {
        res.json(list);
      },
      (error) => {
        res.status(error.status).json(error.toJSON());
      },
    );
  };
