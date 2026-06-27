# Agent Notes

This project is intentionally small. Keep it that way.

## Scope

- Maintain a personal site with articles and resume.
- Keep articles as Markdown files under `content/articles`.
- Keep resume content as Markdown under `content/resume/resume.md`.
- Do not add a database, CMS, login, comments, RAG, embedding, or dynamic config unless explicitly requested.
- Do not migrate old Gelatoni/quickview features into this project by default.

## Commands

Use pnpm:

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm dev
```

## Deployment

Deployment is designed for:

```text
GitHub Actions -> GHCR -> Ubuntu-3 Docker Compose
```

Do not assume GitHub secrets exist. Ask the user before requiring:

- `UBUNTU3_HOST`
- `UBUNTU3_USER`
- `UBUNTU3_SSH_KEY`

Use `$server-resource-bridge` for Ubuntu-3 server resource discovery and durable deployment notes.

## Content Rules

Article frontmatter fields:

- `title`: required string
- `date`: required `YYYY-MM-DD`
- `summary`: optional string
- `tags`: optional string array
- `published`: optional boolean, defaults to true

Keep Markdown plain. Do not introduce MDX unless the user asks for embedded React components inside articles.
