---
title: "2026-06-26-StablePay技术栈总结"
date: "2026-06-26"
category: "StablePay"
published: true
---

# 2026-06-26 StablePay 技术栈总结

## 总体判断

`/Users/xuhuan/workspace 1` 是一个 StablePay 多微服务工作区，不是单体项目。后端主线是 Go 微服务，前端主线是 React + Vite。目录里还有一些 `_wt_*` worktree/分支副本，以及部分代码缺失或不完整的服务。

## 后端技术栈

- 语言：Go 1.24
- HTTP 框架：CloudWeGo Hertz
- RPC 框架：CloudWeGo Kitex
- 服务发现/注册：Nacos
- 配置管理：Viper、本地 YAML、环境变量、Nacos 配置中心
- 数据库：MySQL
- ORM：GORM
- 缓存：Redis
- 消息队列：RocketMQ
- 日志/链路：stablepay-common/log、Zap/Logrus、OpenTelemetry、SLS/Jaeger/OTLP 相关配置
- 监控：Prometheus metrics，部分服务暴露 `/metrics`
- API 文档：Swagger
- 对象存储：阿里云 OSS
- 认证：JWT

## 后端中间件

- JWT 鉴权
- CORS 跨域
- Recovery panic 恢复
- Request Logger 请求日志
- Request ID
- Redis/cache 限流
- Security Headers
- Kitex 日志/链路中间件
- 健康检查 `/health`、就绪检查、Prometheus `/metrics`

## 前端技术栈

- React，项目中 React 18 和 React 19 都有
- Vite，版本不完全统一
- TypeScript
- Axios
- React Router / React Router DOM
- TanStack React Query
- Zustand
- Mantine、MUI、Radix UI、Tailwind CSS
- Tabler Icons、lucide-react
- Recharts、ECharts
- i18next / react-i18next
- Vitest、Testing Library、MSW
- Solana、TronWeb、viem、Reown AppKit 等 Web3 相关库

## 关键系统抽样

### stablepay-merchantportal

商户门户。前端是 React 19 + Vite + Mantine + React Query + Zustand。后端是 Hertz Web API，包含 JWT、Redis、RocketMQ、Swagger，以及多个 Kitex RPC client。

### stablepay-dashboard

运营看板。前端是 React 19 + Vite + ECharts。后端是 Hertz，集成 Lark、PayPlatform RPC、JWT、Prometheus、Nacos 配置热更新。代码里注明 Dashboard 默认不依赖 MySQL。

### stablepay-payout

出款核心服务。后端分层比较清楚，包含 domain、app、infrastructure、adapter。使用 MySQL/GORM、Redis、RocketMQ producer/consumer、Kitex RPC server，同时启动 Hertz 健康检查。

### stablepay-agencyprod

代理/分佣相关系统。后端使用 Go + Hertz/Kitex + GORM + Redis + RocketMQ + Nacos。前端是 React 18 + Vite + MUI + Radix UI + Tailwind。

### stablepay-settleplatform

结算平台。docker-compose 显示依赖 MySQL、Redis、MongoDB、RocketMQ，并拆分 core、charging、recon、datasync 等模块。

## 简单结论

这个工作区整体是 Go 微服务 + React/Vite 前端的支付系统工程。核心中间件是 MySQL、Redis、RocketMQ、Nacos，服务间通信主要靠 Kitex RPC，Web API 主要靠 Hertz。
