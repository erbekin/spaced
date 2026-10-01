export type PageArgs = { limit: number; cursor?: string };
export type Page<T> = { items: T[]; nextCursor: string | null };
