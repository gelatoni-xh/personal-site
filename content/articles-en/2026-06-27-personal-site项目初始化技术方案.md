---
title: "Personal Site: Initial Technical Plan"
date: "2026-09-03"
category: "个人项目"
summary: "The original scope, content model, and deployment plan for a small Markdown-based personal site."
published: true
---

# Personal Site: Initial Technical Plan

This is the project's **initial plan**, created on 2026-06-27 and later given the article date shown above. It records decisions and proposed steps at that point. The repository and deployment method have since evolved, so this document should not be used as current operational instructions.

## Goal

Initialize a small personal-site project and deploy it to Ubuntu-3. The first phase should establish a stable project skeleton and a deployment path suitable for working with AI agents. Product scope was intentionally limited to articles and a resume, without an elaborate administration system.

## Decisions in the Original Plan

- Project name: `personal-site`.
- One Next.js application rather than separate frontend and backend services.
- A minimal engineer/creator style with basic visual quality.
- Markdown articles stored in the repository.
- No old-article migration in the first phase; the content directory could start empty.
- No database or separate API service in the first phase.
- Ubuntu-3 as the deployment target.
- GitHub Actions would build and push a Docker image to GitHub Container Registry, then Docker Compose on Ubuntu-3 would pull and run it.
- The formal domain would be switched to the new site later.

The GHCR approach was a proposal in this initial plan. The project's later deployment notes describe transferring a Docker image archive over SSH instead.

## Proposed Technology

The application stack was Next.js App Router, TypeScript, Tailwind CSS, small amounts of shadcn/ui, `react-markdown`, `remark-gfm`, and `rehype-highlight`. Plain Markdown was chosen over MDX because the first phase did not require React components embedded in articles. This kept authoring and agent-assisted maintenance simpler.

The engineering toolchain used pnpm, ESLint, TypeScript checks, GitHub Actions, Docker images, and Docker Compose on Ubuntu-3. GHCR was the image registry named in this historical plan.

## Proposed Repository Layout

```text
personal-site/
  app/
    page.tsx
    articles/page.tsx
    articles/[slug]/page.tsx
    resume/page.tsx
    layout.tsx
    globals.css
  components/layout/
  components/markdown/
  components/ui/
  content/articles/
  content/resume/resume.md
  lib/content/articles.ts
  lib/content/markdown.ts
  public/
  infra/compose/docker-compose.yml
  .github/workflows/deploy.yml
  Dockerfile
  .dockerignore
  .env.example
  AGENTS.md
  README.md
  package.json
  pnpm-lock.yaml
```

The proposed article frontmatter contained a title, date, one-sentence summary, category, and publication flag. Articles lived in `content/articles/*.md`; resume source content lived in `content/resume/resume.md`.

The first phase excluded online publishing and editing, drafts, a CMS, database synchronization, and object storage.

## Initial Pages

The original page scope was deliberately small: `/` would redirect to `/articles`, `/articles` would show a list including an empty state, `/articles/[slug]` would render an article, and `/resume` would display the resume. Basic navigation, footer, cards, article typography, and code highlighting were acceptable. Complex animation or an administration interface was outside scope.

These were the initial routes; the later bilingual site uses `/en` and `/zh` paths while retaining old article links through redirects.

## Deployment Design in the Initial Plan

The proposed GitHub Actions pipeline would install dependencies, run TypeScript and ESLint checks, build Next.js, build a Docker image, push it to GHCR, then use SSH to trigger a pull and Compose restart on Ubuntu-3. Image tags were proposed as `ghcr.io/<github-owner>/personal-site:<git-sha>` and `:latest`.

The proposed server layout was `/opt/apps/personal-site/` with `docker-compose.yml` and `.env`. The Compose service would be `personal-site`, listening on port 3000 inside the container. Initially, the host could bind `127.0.0.1:3000` to the container, with Nginx, Caddy, Traefik, or Coolify later connecting the public domain.

The server preparation checklist included Docker Engine, the Compose plugin, Git, curl, CA certificates, the app directory, registry pull permission, an SSH deployment path for Actions, and reverse-proxy configuration. The initial document explicitly said these actions had not yet been executed when it was written.

## Scope Exclusions

The first phase excluded separate frontend and backend services, a database, login or admin tools, online article editing, migration of the old system, knowledge-base import, RAG or embeddings, automatic resume updates, a dynamic configuration center, multi-service orchestration, and installing Coolify.

Possible later additions included selecting articles from the old knowledge base, structuring resume content, moving Markdown to a separate repository, search, a sidecar RAG pipeline, PDF resume generation, deployment management with Coolify, and eventually an API or admin service. These were options, not commitments.

## Next Steps Recorded at the Time

After approving the original plan, the proposed sequence was to create the repository, initialize Next.js with TypeScript and Tailwind, add Markdown rendering and content loading, create Docker and Compose templates, create the GitHub Actions workflow, write `AGENTS.md`, prepare Docker on Ubuntu-3, and configure the first deployment.
