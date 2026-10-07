# API Endpoints

Base URL: `http://localhost:8080`

## Legend

- 🔒 Requires `Authorization: Bearer <accessToken>` header
- 🍪 Reads or sets the `refreshToken` httpOnly cookie

---

## General

### `GET /`
Health check.

**Response** `200 text/plain`
```
Hello, World!
```

---

## Users `/users`

### `GET /users/list`
List all users using cursor-based pagination.
Here is user dto:
```typescript
type UserDto = {
    id: string;
    username: string;
    email: string;
    name: string | null;
    createdAt: Date;
}
```
**Query params**

| Param | Type | Default | Max |
|---|---|---|---|
| `limit` | number | 20 | 100 |
| `cursor` | UUID | — | — |

**Response** `200`
```json
{
  "items": [{ "id": "...", "username": "...", "email": "...", "name": "...", "createdAt": "..." }],
  "nextCursor": "..."
}
```
---

### `POST /users/register`
Register a new user. Returns a token pair on success.

**Body**
```json
{
  "email": "user@example.com",
  "password": "secret",
  "username": "johndoe",
  "name": "John Doe"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | ✅ | valid email |
| `password` | string | ✅ | |
| `username` | string | ✅ | 3–48 chars |
| `name` | string | ❌ | display name |

**Response** `201`
```json
{
  "tokens": {
    "accessToken": "...",
    "refreshToken": "..."
  },
  "user": { "id": "...", "username": "...", "name": "...", "email": "..." }
}
```

---

### `POST /users/login`
Log in with username and password. Sets `refreshToken` cookie. 🍪

> Returns `400` if a valid `refreshToken` cookie is already present.

**Body**
```json
{
  "username": "johndoe",
  "password": "secret"
}
```

**Response** `200`
```json
{
  "tokens": { "accessToken": "..." },
  "user": { "id": "...", "username": "...", "name": "...", "email": "..." }
}
```

---

### `POST /users/refresh`
Exchange the `refreshToken` cookie for a new token pair. 🍪
Rotates the cookie with a new `refreshToken`.

**Response** `200`
```json
{ "accessToken": "..." }
```

---

### `POST /users/logout`
Revoke the current session and clear the `refreshToken` cookie. 🍪

**Response** `200`
```json
{ "message": "Logout successful" }
```

---

### `GET /users/me` 🔒
Get the currently authenticated user.

**Response** `200`
```json
{ "id": "...", "username": "...", "name": "...", "email": "..." }
```

---

### `GET /users/me/home-post` 🔒
Get the home post of the currently authenticated user.

**Response** `200`
Returns HomePostDto.
```ts
type HomePostDto = {
    homePost: {
        content: string;
        createdAt: Date;
    } | null;
}
```

---

### `POST /users/me/home-post` 🔒
Create or update the home post of the currently authenticated user.

**Body**
```ts
type HomePostUpdateDto = {
    content: string;
}
```
**Response** `200` or `201`
```json
{ "message": "updated|created successfully" }
```


## Spaces `/spaces`

### `POST /spaces` 🔒
Create a new space owned by the authenticated user.

**Body**
```json
{
  "name": "My Space",
  "slug": "my-space"
}
```

| Field | Type | Notes |
|---|---|---|
| `name` | string | display name |
| `slug` | string | max 64 chars, lowercase |

**Response** `201`
```json
{ "id": "...", "name": "My Space", "slug": "my-space", "ownerId": "..." }
```

---

### `GET /spaces/:username`
List all spaces belonging to a user. Supports cursor-based pagination.

**Query params**

| Param | Type | Default | Max |
|---|---|---|---|
| `limit` | number | 20 | 100 |
| `cursor` | UUID | — | — |

**Response** `200`
```json
{
  "items": [{ "id": "...", "name": "...", "slug": "..." }],
  "nextCursor": "..."
}
```

---

### `GET /spaces/:username/:spaceSlug`
Get a single space with its owner info.

**Response** `200`
```json
{ "id": "...", "name": "...", "slug": "...", "owner": { "id": "...", "username": "..." } }
```

---

### `PATCH /spaces/:spaceSlug` 🔒
Update a space owned by the authenticated user.

**Body** *(all fields optional)*
```json
{
  "name": "New Name",
  "slug": "new-slug",
  "homePostId": "<uuid> | null"
}
```

**Response** `200` — updated space object

---

### `DELETE /spaces/:spaceSlug` 🔒
Delete a space owned by the authenticated user.

**Response** `204 No Content`

---

## Posts `/posts`

### `GET /posts/:username/:spaceSlug`
List posts in a space. Supports cursor-based pagination.

**Query params**

| Param | Type | Default | Max |
|---|---|---|---|
| `limit` | number | 20 | 100 |
| `cursor` | UUID | — | — |

**Response** `200`
```json
{
  "items": [{ "id": "...", "title": "...", "content": "..." }],
  "nextCursor": "..."
}
```

---

### `POST /posts/:username/:spaceSlug` 🔒
Create a post inside a space.

**Body**
```json
{
  "title": "My Post",
  "content": "Post body here."
}
```

**Response** `201`
```json
{ "id": "...", "title": "My Post", "content": "Post body here." }
```

---

### `GET /posts/:postId`
Get a single post by its ID.

**Response** `200`
```json
{ "id": "...", "title": "...", "content": "..." }
```

---

### `PATCH /posts/:postId` 🔒
Update a post. At least one of `title` or `content` must be provided.

**Body** *(at least one required)*
```json
{
  "title": "Updated Title",
  "content": "Updated content."
}
```

**Response** `200` — updated post object

---

### `DELETE /posts/:postId` 🔒
Delete a post by its ID.

**Response** `204 No Content`

## Subscriptions

### `POST /subscriptions/subscribe/:username/:spaceSlug` 🔒
Subscribe to a space.
**Response** 200 - subscription created
### `POST /subscriptions/unsubscribe/:username/:spaceSlug` 🔒
Unsubscribe.

### `GET /subscriptions/:username` 🔒
Get list of subscriptions of user.  
**Response** Array.
```json
[
  {
    id: string;
    userId: string;
    spaceId: string;
  }
]
```

### `GET /subscriptions/:username/spaces/:spaceSlug`
Get list of subscriptions for a space owned by a user.
**Response** Array.
```json
[
  {
    id: string;
    userId: string;
    spaceId: string;
  }
]
```

---

### `GET /subscriptions/details`
Get subscription details by subscription IDs.

**Query**
```
subid=id1,id2,id3 OR
subid=id1&subid=id2&subid=id3 OR
subid[]=id1&subid[]=id2&subid[]=id3 OR
subid[0]=id1&subid[1]=id2&subid[2]=id3
e.g.
GET /subscriptions/details?subid=63eb8aa4-be4e-43fa-a52d-ac2d4cdbffbe,63eb8aa4-be4e-43fa-a52d-ac2d4cdbffbe
```
Maximum number of subscription IDs: 50

Duplicate subscription IDs are ignored.

**Response** Array.
```json
[
  "count": <number of found subscriptions>,
  "found": [
    {
      "id": "id of subs",
      "user": {
        "id": "id of user",
        "username": "...",
        "name": "can be null",
      },
      "space": {
        "id": "id of space",
        "slug": "...",
        "name": "..."
      }
    }
  ],
  "notFound": [<ids that were not found>]
]
```

### `POST /subscriptions/details`
Same as `GET /subscriptions/details`, but uses a JSON body.
Maximum number of subscription IDs: 500
