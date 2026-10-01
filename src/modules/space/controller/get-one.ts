import type { Handler } from "express";
import type { ISpaceService } from "../service";

export const GetOneSpaceController = (spaceService: ISpaceService): Handler => (req, res) => {
  const { username, spaceSlug } = req.params;
  if (typeof username !== 'string' || typeof spaceSlug !== 'string') {
    throw new Error("dynamic username or spaceSlug is not a string")
  }
  spaceService.get(username, spaceSlug)
    .match((spaceEntityWithOwner) => {
      res.json(spaceEntityWithOwner);
    }, (error) => {
      res.status(error.status).json(error);
    })
}
