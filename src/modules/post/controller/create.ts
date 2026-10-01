import type { Handler } from "express";
import type { IPostService } from "../service";
import z from "zod";
import { defineErrors, type ApiError } from "../../../lib/api-error";

const createPostSchema = z.object({
  title: z.string(),
  content: z.string(),
});

const apiError = defineErrors('post::create', {
  INVALID_BODY: { message: "Invalid body", status: 400 },
})

export const CreatePostController = (postService: IPostService): Handler => (req, res) => {
  const { username, spaceSlug, } = req.params;
  if (typeof username !== "string" || typeof spaceSlug !== "string")
    throw new Error("username and spaceSlug are required");
  const result = createPostSchema.safeParse(req.body);
  if (!result.success) {
    apiError.use('INVALID_BODY')((error) => res.status(error.status).json(error));
    return;
  }
  const { title, content } = result.data;
  const dto = { title, content, username, spaceSlug };
  postService.create(dto)
    .match((post) => {
      res.status(201).json(post);
    }, (error) => {
      res.status(error.status).json(error);
    })
}
