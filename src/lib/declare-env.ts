import ms from "ms";


declare module "bun" {
  interface Env {
    JWT_SECRET_ACCESS: string;
    JWT_SECRET_REFRESH: string;
    JWT_ACCESS_TOKEN_EXPIRY: ms.StringValue;
    JWT_REFRESH_TOKEN_EXPIRY: ms.StringValue;
  }
}
