
export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export class BunPasswordHasher implements IPasswordHasher {
  private static instance: IPasswordHasher | undefined;
  static getInstance(): IPasswordHasher {
    if (!BunPasswordHasher.instance) {
      BunPasswordHasher.instance = new BunPasswordHasher();
    }
    return BunPasswordHasher.instance;
  }
  async hash(password: string): Promise<string> {
    return await Bun.password.hash(password, 'bcrypt');
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return await Bun.password.verify(password, hash, 'bcrypt');
  }
}

const passwordHasher = new BunPasswordHasher();
