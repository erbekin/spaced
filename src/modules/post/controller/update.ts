import type { Handler } from "express";
import type { IPostService } from "../service";
import z from "zod";
import { defineErrors, withPayload } from "../../../lib/api-error";

const UpdatePostSchema = z
  .object({
    title: z.string().trim().optional(),
    content: z.string().trim().optional(),
  })
  .refine((data) => Boolean(data.title || data.content), {
    message: "At least one of 'title' or 'content' is required.",
  });

const apiError = defineErrors("post::update", {
  INVALID_BODY: withPayload<{ issues: any }>({ message: "Invalid body.", status: 400 }),
  UNAUTHORIZED: { message: "Unauthorized.", status: 401 },
});

export const UpdatePostController =
  (postService: IPostService): Handler =>
  (req, res) => {
    const { postId } = req.params;
    if (typeof postId !== "string") {
      throw new Error("Invalid postId path parameter");
    }
    const result = UpdatePostSchema.safeParse(req.body);
    if (!result.success) {
      return apiError.use("INVALID_BODY", {payload:{issues: result.error?.issues}})((err) => res.status(err.status).json(err));
    }
    const { title, content } = result.data;
    const userId = res.locals.accessToken?.userId;
    if (!userId) {
      return apiError.use("UNAUTHORIZED")((err) => res.status(err.status).json(err));
    }
    postService.update({ title, content, postId, userId }).match(
      (post) => res.json(post),
      (error) => res.status(error.status).json(error),
    );
  };
