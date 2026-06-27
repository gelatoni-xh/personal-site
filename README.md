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

GitHub Actions builds and pushes:

```text
ghcr.io/<github-owner>/personal-site:<git-sha>
ghcr.io/<github-owner>/personal-site:latest
```

Required GitHub repository secrets:

```text
UBUNTU3_HOST
UBUNTU3_USER
UBUNTU3_SSH_KEY
```

Ubuntu-3 runtime directory:

```text
/opt/apps/personal-site/
  docker-compose.yml
  .env
```

The server-side `.env` should set:

```text
PERSONAL_SITE_IMAGE=ghcr.io/<github-owner>/personal-site:latest
NEXT_PUBLIC_SITE_URL=https://gelatoni.uk
```
