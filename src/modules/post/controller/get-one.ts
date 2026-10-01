import type { Handler } from "express";
import type { IPostService } from "../service";
import { defineErrors } from "../../../lib/api-error";

// const apiError = defineErrors("post::get", {
//   UNAUTHORIZED: { message: "Unauthorized", status: 401 },
// });

export const GetOnePostController =
  (postService: IPostService): Handler =>
  (req, res) => {
    const { postId } = req.params;
    if (typeof postId !== "string") {
      throw new Error("expected postId path parameter to be a string");
    }
    // const username = res.locals.accessToken?.username;
    // if (!username) {
    //   return apiError.use("UNAUTHORIZED")((error) => res.status(error.status).json(error));
    // }
    postService.getById(postId).match(
      (post) => res.json(post),
      (error) => res.status(error.status).json(error),
    );
  };
