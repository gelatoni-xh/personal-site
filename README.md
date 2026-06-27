# personal-site

Minimal personal site for articles and resume.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Markdown content with `react-markdown`
- Docker image deployment
- GitHub Actions + GHCR + Ubuntu-3 Docker Compose

## Local Development

```bash
pnpm install
pnpm dev
```

Open:

```text
http://localhost:3000/articles
```

The root path redirects to `/articles`.

## Content

Articles:

```text
content/articles/*.md
```

Resume:

```text
content/resume/resume.md
```

Article frontmatter:

```yaml
---
title: "Title"
date: "2026-06-27"
summary: "Short summary"
tags: ["AI", "Engineering"]
published: true
---
```

## Deployment Notes

Repository:

```text
https://github.com/gelatoni-xh/personal-site
```

GitHub Actions builds and pushes a GHCR image for traceability:

```text
ghcr.io/<github-owner>/personal-site:<git-sha>
ghcr.io/<github-owner>/personal-site:latest
```

Deployment does not require Ubuntu-3 to pull from GHCR. Actions also uploads a Docker image archive over SSH and runs `docker load` on the server, avoiding a server-side GitHub package token.

Required GitHub repository secrets:

```text
UBUNTU3_HOST
UBUNTU3_USER
UBUNTU3_SSH_KEY
```

`UBUNTU3_SSH_KEY` uses a project-specific deploy key stored locally at:

```text
/Users/xuhuan/workspace_new/server-access/personal-site-deploy
```

Ubuntu-3 runtime directory:

```text
/opt/apps/personal-site/
  docker-compose.yml
  .env
```

The server-side `.env` should set:

```text
PERSONAL_SITE_IMAGE=personal-site:latest
NEXT_PUBLIC_SITE_URL=https://gelatoni.uk
```
