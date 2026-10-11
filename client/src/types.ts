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

export type Post = {
  id: string;
  title: string;
  spaceId: string;
  createdAt: string;
  updatedAt: string;
};

export type HomePostDto = {
  homePost: {
    content: string;
    createdAt: string;
  } | null;
};

export type AuthResponse = {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  user: User;
};

export type PostWithSpaceInfo = {
  id: string;
  title: string;
  content: string;
  spaceId: string;
  createdAt: Date;
  updatedAt: Date;
  space: {
    id: string;
    slug: string;
    owner: {
      id: string;
      name: string | null;
      username: string;
    };
  };
};

export type UserHomeInfo = {
  user: {
    id: string;
    username: string;
    name: string | null;
  };
  homePost: HomePostDto['homePost']
};

export type SpaceEntity = {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
}


export type SpaceHomePostDto = {
    spaceId: string;
    content: string;
    createdAt: string;
}


export type SpaceEntityEx = SpaceEntity & {
    owner: {
        id: string;
        username: string;
        name: string | null;
    };
    spaceHomePost: HomePostDto['homePost'];
}

export type SubscriptionDetail = {
  id: string;
  user: {
    id: string;
    username: string;
    name: string | null;
  };
  space: {
    id: string;
    slug: string;
    name: string;
    owner: {
      id: string;
      username: string;
      name: string | null;
    };
  };
};
