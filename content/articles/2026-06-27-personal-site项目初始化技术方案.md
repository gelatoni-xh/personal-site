---
title: "2026-06-27-personal-site项目初始化技术方案"
date: "2026-06-27"
category: "个人项目"
published: true
---

# 2026-06-27 personal-site 项目初始化技术方案

创建日期：2026-06-27

## 目标

初始化一个最小化个人站点项目 `personal-site`，部署到 Ubuntu-3。

第一阶段只建立稳定、简单、适合 AI Agent 协作的项目骨架和部署通路。业务功能保持克制，只预留文章和简历两个内容入口，不做复杂后台。

## 已确认决策

- 项目名：`personal-site`
- 本地目录：`/Users/xuhuan/workspace_new/project/personal-site`
- 架构：前后端暂不分离，一个 Next.js 项目承载站点
- 站点风格：极简个人主页，偏工程师/创作者，但保留基本 UI 质感
- 内容形态：文章使用 Markdown 文件，先放在项目仓库内
- 文章迁移：本阶段不迁移旧文章，内容目录可以先为空
- 后端/数据库：本阶段不引入数据库，也不做独立 API 服务
- 部署目标：Ubuntu-3
- 部署方式：GitHub Actions 构建 Docker 镜像，推送到 GHCR，Ubuntu-3 使用 Docker Compose 拉取并运行
- 服务器准备：Ubuntu-3 可以安装 Docker 和 Compose plugin
- 域名：后续直接使用正式域名切换到新站点

## 技术栈

### 应用

- Next.js App Router
- TypeScript
- Tailwind CSS
- 少量 shadcn/ui 组件
- Markdown 渲染：`react-markdown`
- Markdown 扩展：`remark-gfm`
- 代码高亮：`rehype-highlight`

选择 `react-markdown` 而不是 MDX，是因为第一阶段文章只有 Markdown，不需要在文章里嵌入 React 组件。这样更简单，Agent 修改和调试成本更低。

### 工程

- 包管理：`pnpm`
- 代码质量：ESLint + TypeScript check
- 构建产物：Docker image
- 镜像仓库：GitHub Container Registry
- CI/CD：GitHub Actions
- 运行时：Docker Compose on Ubuntu-3

## 推荐项目结构

```text
personal-site/
  app/
    page.tsx
    articles/
      page.tsx
      [slug]/
        page.tsx
    resume/
      page.tsx
    layout.tsx
    globals.css
  components/
    layout/
    markdown/
    ui/
  content/
    articles/
      .gitkeep
    resume/
      resume.md
  lib/
    content/
      articles.ts
      markdown.ts
  public/
  infra/
    compose/
      docker-compose.yml
  .github/
    workflows/
      deploy.yml
  Dockerfile
  .dockerignore
  .env.example
  AGENTS.md
  README.md
  package.json
  pnpm-lock.yaml
```

## 内容约定

文章文件放在：

```text
content/articles/*.md
```

文章 frontmatter：

```yaml
---
title: "文章标题"
date: "2026-06-27"
summary: "一句话摘要"
category: "个人项目"
published: true
---
```

简历文件放在：

```text
content/resume/resume.md
```

本阶段不做在线发布、在线修改、草稿系统、CMS、数据库同步或对象存储。

## 页面初始化范围

只初始化最小页面：

- `/`：重定向到 `/articles`，不做单独首页
- `/articles`：文章列表，支持空状态
- `/articles/[slug]`：文章详情
- `/resume`：简历页面

UI 可以有基础导航、页脚、内容卡片、文章排版和代码高亮，但不要引入复杂动效或后台界面。

## 部署设计

### GitHub Actions

流水线职责：

1. 安装依赖
2. TypeScript/ESLint 检查
3. 构建 Next.js
4. 构建 Docker image
5. 推送到 GHCR
6. 通过 SSH 触发 Ubuntu-3 拉取镜像并重启 Compose 服务

推荐镜像命名：

```text
ghcr.io/<github-owner>/personal-site:<git-sha>
ghcr.io/<github-owner>/personal-site:latest
```

### Ubuntu-3 运行目录

建议运行目录：

```text
/opt/apps/personal-site/
  docker-compose.yml
  .env
```

Compose 服务名：

```text
personal-site
```

容器内部监听：

```text
3000
```

初期宿主机可以映射到本地端口：

```text
127.0.0.1:3000 -> container:3000
```

最终通过 Nginx、Caddy、Traefik 或 Coolify 接入正式域名。

## Ubuntu-3 初始化要求

需要安装：

- Docker Engine
- Docker Compose plugin
- Git
- 基础工具：`curl`, `ca-certificates`

需要准备：

- `/opt/apps/personal-site`
- GHCR 拉取权限
- GitHub Actions SSH 部署权限
- 反向代理配置，后续切域名时再做

这些动作不在本文档生成时执行，后续确认后再由 Agent 操作。

## 暂不做

本阶段明确不做：

- 前后端分离
- 数据库
- 登录/后台
- 在线文章发布或编辑
- 旧系统迁移
- 知识库导入
- RAG/embedding
- 自动简历更新
- 动态配置中心
- 多服务编排
- Coolify 安装

## 后续扩展路径

当第一版站点稳定后，再逐步考虑：

- 从旧知识库筛选文章导入
- 简历内容结构化
- Markdown 内容托管独立仓库
- 搜索
- RAG/embedding 旁路流水线
- 自动生成 PDF 简历
- Coolify 管理部署
- 拆分 API 或后台服务

## 下一步

确认本方案后，再执行项目初始化：

1. 创建 `/Users/xuhuan/workspace_new/project/personal-site`
2. 初始化 Next.js + TypeScript + Tailwind 项目
3. 加入 Markdown 渲染和内容读取
4. 创建 Dockerfile 和 Compose 模板
5. 创建 GitHub Actions workflow
6. 编写 `AGENTS.md`
7. 在 Ubuntu-3 安装 Docker/Compose
8. 配置首次部署
