import { makeErrorFactory, type ErrorModule } from "../../lib/error-module"

interface IPostErrors {
  SERVICE_FAILURE: undefined,
  REPOSITORY_FAILURE: undefined,
  SPACE_NOT_FOUND: { spaceSlug: string }
  POST_NOT_FOUND: { postId: string }
  FORBIDDEN: undefined,
}

export type PostError = ErrorModule<IPostErrors>;

export const PostError = makeErrorFactory<PostError>("post", {
  SERVICE_FAILURE: { message: "Service failure" },
  REPOSITORY_FAILURE: { message: "Repository failure" },
  SPACE_NOT_FOUND: { message: "Space not found", status: 404 },
  POST_NOT_FOUND: { message: "Post not found", status: 404 },
  FORBIDDEN: { message: "Forbidden", status: 403 },
})
