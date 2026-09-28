import type { Request, Response, NextFunction } from "express"
import type { ApiError } from "../../../lib/api-error"
export function writeApiError<E, C extends Extract<keyof E, string>>(res: Response, error: ApiError<E, C>) {
  res.status(error.status).json(error);
}
