---
title: "StablePay Workspace: Technology Inventory"
date: "2026-09-01"
category: "stablepay"
summary: "A codebase inventory of a Go microservice and React/Vite payment platform workspace."
published: true
---

# StablePay Technology Inventory

## Scope of This Inventory

The inspected workspace at `/Users/xuhuan/workspace 1` contained multiple StablePay microservices, rather than one monolithic application. The backend was primarily Go services; the frontend was primarily React and Vite. Some `_wt_*` directories were worktree or branch copies, and some service checkouts were incomplete. This is a workspace inventory, not a claim that I personally implemented every component listed below.

## Backend

- **Language:** Go 1.24
- **HTTP and RPC:** CloudWeGo Hertz and Kitex
- **Discovery and configuration:** Nacos, Viper, local YAML, and environment variables
- **Data:** MySQL with GORM, Redis, and RocketMQ
- **Logging and tracing:** `stablepay-common/log`, Zap or Logrus, OpenTelemetry, and configuration for SLS, Jaeger, and OTLP
- **Monitoring and API documentation:** Prometheus metrics, `/metrics` on some services, and Swagger
- **Other integrations:** Alibaba Cloud OSS and JWT authentication

Backend middleware included JWT authentication, CORS, panic recovery, request logging and IDs, Redis or cache-based rate limiting, security headers, Kitex logging and tracing, health and readiness checks, and Prometheus metrics.

## Frontend

The workspace contained React 18 and 19 projects, with Vite versions that were not fully aligned. Libraries included TypeScript, Axios, React Router, TanStack React Query, Zustand, Mantine, MUI, Radix UI, Tailwind CSS, Tabler Icons, lucide-react, Recharts, ECharts, i18next, Vitest, Testing Library, and MSW. Some projects also used Solana, TronWeb, viem, and Reown AppKit.

## Sampled Systems

### `stablepay-merchantportal`

The merchant portal used React 19, Vite, Mantine, React Query, and Zustand. Its Hertz API included JWT, Redis, RocketMQ, Swagger, and multiple Kitex RPC clients.

### `stablepay-dashboard`

The operations dashboard used React 19, Vite, and ECharts. Its Hertz backend integrated Lark, a PayPlatform RPC service, JWT, Prometheus, and Nacos configuration hot reload. Code comments said that the dashboard did not depend on MySQL by default.

### `stablepay-payout`

The core payout service had distinct domain, application, infrastructure, and adapter layers. It used MySQL/GORM, Redis, RocketMQ producers and consumers, a Kitex RPC server, and a Hertz health endpoint.

### `stablepay-agencyprod`

This agency and commission system used Go, Hertz, Kitex, GORM, Redis, RocketMQ, and Nacos on the backend. Its frontend used React 18, Vite, MUI, Radix UI, and Tailwind CSS.

### `stablepay-settleplatform`

The settlement platform's Docker Compose configuration listed MySQL, Redis, MongoDB, and RocketMQ. Its modules included `core`, `charging`, `recon`, and `datasync`.

## Summary

Across the inspected workspace, the main architecture was Go microservices with React/Vite frontends. MySQL, Redis, RocketMQ, and Nacos were common infrastructure; Kitex handled much of the service-to-service RPC traffic, while Hertz served web APIs.
