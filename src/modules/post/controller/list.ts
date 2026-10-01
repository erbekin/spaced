import type { Handler } from "express";
import type { IPostService } from "../service";
import z from "zod";
import { defineErrors } from "../../../lib/api-error";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const ListPostQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  cursor: z.uuidv4().optional(),
});

const apiErrors = defineErrors("post::list", {
  INVALID_INPUT: { message: "Invalid input", status: 400 },
});
export const ListPostsController =
  (postService: IPostService): Handler =>
  (req, res) => {
    const { username, spaceSlug } = req.params;
    if (typeof username !== "string" || typeof spaceSlug !== "string") {
      throw new Error("username, spaceSlug url parameters are required");
    }
    const result = ListPostQuerySchema.safeParse(req.query);
    if (!result.success) {
      throw apiErrors.use("INVALID_INPUT")((error) => res.status(400).json(error));
    }
    const { limit, cursor } = result.data;
    const page = { limit, cursor };
    postService.list(username, spaceSlug, page).match(
      (posts) => res.json(posts),
      (error) => res.status(error.status).json(error),
    );
  };
