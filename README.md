# CloudTask Pro

CloudTask Pro is a collaborative project management app with a React + TypeScript client, an Express REST API, PostgreSQL/Prisma storage, and Redis-backed rate limiting. It supports account sessions, workspaces, project membership, task boards, subtasks, comments, attachments, notifications, and activity history.

## Local setup

1. Copy `backend/.env.example` to `backend/.env` and replace both JWT secrets with separate random values.
2. Copy `frontend/.env.example` to `frontend/.env` if the API is not running at `http://localhost:5000/api`.
3. Start PostgreSQL and Redis with `docker compose up -d`.
4. In `backend/`, run `npm install`, `npm exec prisma generate`, `npm exec prisma migrate deploy`, then `npm run dev`.
5. In `frontend/`, run `npm install` and `npm run dev`.

The API health check is `GET /health`. The local upload limit is 10 MB; accepted file types are listed in `backend/src/middleware/upload.middleware.js`. Uploaded files are stored under `backend/uploads/`, which is ignored by Git.

## Main API groups

- `/api/auth` — register, login, refresh, logout, current user, profile update
- `/api/workspaces` — workspace CRUD and member roles
- `/api/projects` — project CRUD and project members
- `/api/tasks` — task board, filtering, assignment, status, priority, soft deletion
- `/api/subtasks` and `/api/comments` — task collaboration
- `/api/attachments` — local task file uploads
- `/api/notifications` — user inbox and read state
- `/api/activity` — workspace, project, and task history

Protected routes use `Authorization: Bearer <access-token>`. Refresh tokens are stored as hashes and rotated on refresh. If Redis is unavailable, the API falls back to in-process rate limiting.

## Checks

From `frontend/`, run `npm run lint` and `npm run build`. From `backend/`, use `npm exec prisma validate` and `node --check` on files under `src/`.
