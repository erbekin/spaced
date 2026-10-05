export type User = {
  id: string;
  username: string;
  email: string;
  name: string | null;
};

export type Space = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  nextCursor?: string;
};

export type AuthResponse = {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  user: User;
};
