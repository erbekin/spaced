import { configDotenv } from "dotenv";
import { Maybe } from "purify-ts";


export type Config = {
  port: number;
  databaseUrl: string;
  jwt: {
    accessToken: {
      secret: string;
      /** expiration in ms  */
      expiration: number;
    },
    refreshToken: {
      secret: string;
      /** expiration in ms  */
      expiration: number;
    },
  },
};

export function loadConfig(useDotEnv: boolean = false): Config {
  if (useDotEnv) {
    configDotenv({debug: false});
  }
  function readEnv(key: string): Maybe<string> {
    return Maybe.fromNullable(process.env[key]);
  }
  function readEnvNumber(key: string): number {
    const numberRegex = /^\s*\d+\s*$/;
    return readEnv(key)
      .ifJust((val) => {
        if (!numberRegex.test(val)) throw new Error(`Expected number for ${key}`);
        return parseInt(val);
      })
      .map(parseInt)
      .ifJust((n) => {
        if (!Number.isInteger(n) && n <= 0) throw new Error(`Expected positive integer for ${key}`)
      })
      .unsafeCoerce();
  }

  return {
    port: process.env.PORT ? parseInt(process.env.PORT) : 8080,
    databaseUrl: readEnv('DATABASE_URL').unsafeCoerce(),
    jwt: {
      accessToken: {
        secret: readEnv('JWT_SECRET_ACCESS').unsafeCoerce(),
        expiration: readEnvNumber('JWT_ACCESS_TOKEN_EXPIRY'),
      },
      refreshToken: {
        secret: readEnv('JWT_SECRET_REFRESH').unsafeCoerce(),
        expiration: readEnvNumber('JWT_REFRESH_TOKEN_EXPIRY'),
      },
    },
  };
}

export const config = loadConfig(true);
