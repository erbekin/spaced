import type { Handler } from "express";
import { defineErrors } from "../../../lib/api-error";
import type { IPostService } from "../service";

const apiError = defineErrors("post::delete", {
  UNAUTHORIZED: { message: "Unauthorized", status: 401 },
});

export const DeletePostController =
  (postService: IPostService): Handler =>
  (req, res) => {
    const { postId } = req.params;
    if (typeof postId !== "string") {
      throw new Error("path parameter 'postId' must be a string");
    }
    const userId = res.locals.accessToken?.userId;
    if (!userId) {
      throw apiError.use("UNAUTHORIZED")((error) => res.status(error.status).json(error));
    }

    postService.delete({ postId, userId }).match(
      () => res.sendStatus(204),
      (error) => res.status(error.status).json(error),
    );
  };
