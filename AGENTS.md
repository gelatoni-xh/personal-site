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
GitHub Actions -> Docker image archive over SSH -> Ubuntu-3 Docker Compose
```

The workflow still pushes GHCR images for traceability, but Ubuntu-3 does not need a GitHub package token. It loads the image archive uploaded by Actions.

GitHub repository:

```text
https://github.com/gelatoni-xh/personal-site
```

Repository secrets are expected:

- `UBUNTU3_HOST`
- `UBUNTU3_USER`
- `UBUNTU3_SSH_KEY`

The deploy key is project-specific and stored locally at:

```text
/Users/xuhuan/workspace_new/server-access/personal-site-deploy
```

Use `$server-resource-bridge` for Ubuntu-3 server resource discovery and durable deployment notes.

## Content Rules

Article frontmatter fields:

- `title`: required string
- `date`: required `YYYY-MM-DD`
- `summary`: optional string
- `tags`: optional string array
- `published`: optional boolean, defaults to true

Keep Markdown plain. Do not introduce MDX unless the user asks for embedded React components inside articles.
