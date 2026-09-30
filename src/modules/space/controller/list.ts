
import type { Handler } from "express";
import type { ISpaceService } from "../service";

export const ListSpaceController = (spaceService: ISpaceService) : Handler => (req, res) => {
  const { username } = req.params;
  if (typeof username !== 'string') {
    throw new Error('username url parameter is required');
  }
  spaceService.list(username)
    .match((spaces) => {
      return res.status(200).json(spaces);
    }, (error) => {
      return res.status(error.status).json(error);
    })
}
