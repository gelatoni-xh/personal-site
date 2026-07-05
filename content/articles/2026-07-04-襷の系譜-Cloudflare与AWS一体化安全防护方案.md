---
title: "2026-07-04-襷の系譜-Cloudflare与AWS一体化安全防护方案"
date: "2026-07-04"
category: "个人项目"
tags: []
published: true
---

# 襷の系譜 Cloudflare 与 AWS 一体化安全防护方案

## 目标

这份方案把三件事合在一起：

1. 源站入口安全
2. Cloudflare 基础安全与反爬虫
3. `tasuki-keifu` 高价值页面的定向保护

方案目标不是做成重型企业安全体系，而是给个人开发的数据站落一版：

- 简单
- 维护成本低
- 能明显提升抗直连、抗扫描、抗批量抓取能力

---

## 当前现状

### Cloudflare 侧现状

当前 `tasukikeifu.com` 已接入 Cloudflare，主域名和 `www` 都在代理模式下。

已确认状态：

- Cloudflare 代理已开启
- `Security Level = medium`
- `Browser Check = on`
- `SSL = strict`
- `HTTP/3 = on`
- `TLS 1.3 = on`
- `Automatic HTTPS Rewrites = on`
- `Always Use HTTPS = on`
- `Minimum TLS Version = 1.2`
- 已挂载 Cloudflare 免费托管规则集
- 已启用第一版 rate limit 规则
- 已启用一条自定义防火墙规则：对非搜索引擎访问 `sitemap.xml` 做 `Managed Challenge`
- 已启用一条自定义防火墙规则：对高价值数据页上的明显脚本 UA 做 `Managed Challenge`
- 已启用一条自定义防火墙规则：对高价值数据页上的空 UA 请求做 `Managed Challenge`

这意味着：

- 域名访问会先经过 Cloudflare
- Cloudflare 侧已经有第一版基础防护和轻量反爬
- 但规则仍然偏克制，后续还可以继续细化

### AWS / 源站侧现状

生产部署在 AWS Lightsail `Ubuntu-3`，公网 IP 为 `13.230.244.67`。

已确认状态：

- Lightsail 对公网开放 `22`
- `80/443` 已限制为只允许 Cloudflare IPv4 / IPv6 网段访问
- `3000` 已关闭公网暴露
- `nginx` 监听 `0.0.0.0:80` 和 `0.0.0.0:443`
- `personal-site` 容器监听 `0.0.0.0:3000`
- `tasuki-keifu` 应用本身监听 `127.0.0.1:3020`

并且已实测确认：

- 通过域名访问 `https://tasukikeifu.com/ja` 与 `https://gelatoni.uk/articles` 均正常返回 `200`
- 直接访问源站 IP 的 `80/443` 已超时

这意味着：

- 对 Web 流量而言，Cloudflare 已基本成为唯一入口
- 知道源站 IP 的人，无法再直接通过公网 `80/443` 绕过 Cloudflare
- 站点公网暴露面已经明显缩小

### 应用侧现状

项目没有明显公开 `/api` 路由，核心数据主要通过服务端渲染页面输出。

最值得保护的页面不是首页，而是：

1. `/{locale}/players`
2. `/{locale}/competitions/{slug}`
3. `/{locale}/players/{slug}`
4. `/{locale}/organizations`
5. `/{locale}/competitions`
6. `/sitemap.xml`

---

## 风险判断

### 风险 1：SSH 仍对全网开放

当前最主要仍待继续收口的入口，是 `22/tcp` 还对全网开放。

不过当前已经完成：

- 禁止密码登录
- 禁止 root 直接登录
- 保留 PEM / 公钥登录

所以 SSH 风险已经低于“用户名密码登录”的常见状态，但仍会暴露被扫描面。

### 风险 2：高价值页面可被批量抓取

站点是数据站，数据是核心资产。当前高价值页面存在以下问题：

- 可通过筛选、分页、slug 枚举进行系统性采集
- 某些页面单次请求的数据密度高
- 某些查询本身对数据库和服务端不便宜

### 风险 3：反爬规则仍偏轻

当前第一版反爬已经落下，但还属于偏克制方案：

- 高价值页面使用一条总 rate limit 规则兜底
- `sitemap.xml` 单独加了一条 challenge

后续仍可继续向更精细的页面分层演进。

---

## 方案原则

### 1. 先做“入口收口”，再做“精细规则”

让 Cloudflare 真正成为主要入口，比先堆很多复杂 bot 规则更重要。

### 2. 不做全站重型防护

这是公开数据站，不适合一开始就全站验证码或全站强挑战。

### 3. 重点保护高价值页面

保护重点不是所有 URL 一视同仁，而是优先保护最容易泄露核心资产、最容易被批量抓取的页面。

### 4. 优先选择低维护动作

第一版应优先采用：

- 源站收口
- WAF
- 轻量 bot 防护
- 限速
- Managed Challenge

而不是先上复杂站内验证码逻辑。

---

## 可以不变的内容

以下内容当前可以保留：

- 继续使用 Cloudflare 代理
- 保留 `Security Level = medium`
- 保留 `Browser Check = on`
- 保留 `HTTP/3 = on`
- 保留 `TLS 1.3 = on`
- 保留 `nginx -> 127.0.0.1:3020 -> tasuki-keifu` 这条内部链路

原因：

- 这些设置本身方向是对的
- 不会明显干扰正常用户
- 已经具备基础价值

---

## 已完成的第一版落地

### 1. 源站入口收口

已完成：

1. `3000/tcp` 已从 Lightsail 公网入口关闭
2. `80/tcp` 已限制为仅允许 Cloudflare IPv4 / IPv6 网段访问
3. `443/tcp` 已限制为仅允许 Cloudflare IPv4 / IPv6 网段访问
4. 源站 IP 直连 `80/443` 已验证超时

结果：

- Web 流量已基本只能通过 Cloudflare 进入
- 源站 IP 绕过 Cloudflare 的路径已明显收紧
- 另一站 `gelatoni.uk` 访问保持正常

### 2. Cloudflare 基础安全补齐

已完成：

1. `Always Use HTTPS = on`
2. `Minimum TLS Version = 1.2`
3. `SSL = Full (strict)`
4. Cloudflare 免费托管规则集已挂载

结果：

- HTTPS 链路更统一
- 边缘到源站的证书校验更严格
- Cloudflare 已具备基础托管安全能力

### 3. 第一版反爬与轻量防护

已完成：

1. 一条总 rate limit 规则已启用
2. 规则覆盖路径中包含 `/players`、`/competitions`、`/organizations` 的高价值数据页面
3. 当前阈值为 `10 秒 400 次`
4. 当前动作为短时 `block`
5. 已排除 `cf.client.bot`
6. 自定义防火墙规则已启用：对非搜索引擎访问 `/sitemap.xml` 执行 `Managed Challenge`
7. 自定义防火墙规则已启用：对高价值数据页上的明显脚本 UA 执行 `Managed Challenge`
8. 自定义防火墙规则已启用：对高价值数据页上的空 UA 请求执行 `Managed Challenge`

结果：

- 已能拦住非常明显的 burst scraping
- 目录级枚举入口 `sitemap.xml` 已增加额外门槛
- 常见脚本采集器 UA 已在高价值数据页上被单独挑战
- 空 UA 这类非常可疑的采集请求已被单独挑战
- 正常首页和主要站点访问未被误伤

### 4. SSH 登录层加固

已完成：

1. `PermitRootLogin no`
2. `PasswordAuthentication no`
3. `KbdInteractiveAuthentication no`
4. 保留 `PubkeyAuthentication yes`
5. 现有 PEM / 公钥登录链路已复测正常

结果：

- SSH 继续可用
- 但已从策略上明确只接受公钥登录
- 避免了在 VPN / 不稳定公网 IP 场景下误用固定白名单把自己锁在外面

---

## 后续可选增强

### A. 源站入口收口

当前剩余可选项：

1. 继续收紧 `22`
2. 如果未来有更稳定的管理入口，再考虑做 SSH 白名单或更进一步的主机级访问控制

可获得的收益：

- 进一步减少 SSH 扫描面
- 进一步缩小整机暴露面

### B. Cloudflare 基础安全补齐

当前剩余可选项：

1. 后续如果补足证书策略，可继续把续期方案从当前 Let’s Encrypt 路线收得更干净
2. 可以继续观察是否需要更强的 bot / WAF 分层

可获得的收益：

- 让 Cloudflare-only 长期维护更丝滑
- 让源站证书和 Cloudflare 入口策略更一致

### C. 启动第一版轻量反爬

当前剩余可选项：

1. 将 `players` 从总规则中单独拆出来
2. 将 `competitions/{slug}` 尤其是 `tab=race-units` 单独拆出来
3. 继续优化目录页与详情页的保护强度差异

可获得的收益：

- 让反爬更接近真实资产价值分层
- 减少“一条总规则”带来的粗粒度限制

---

## 当前落地后的结构

### 第一部分：入口安全

当前状态：

1. `tasuki-keifu` 继续通过 Cloudflare + nginx 暴露
2. `3000` 不再对公网开放
3. `80/443` 已在 AWS / Lightsail 层收成 Cloudflare-only
4. `22` 继续保留，但通过 SSH 配置加固降低风险

当前效果：

- Cloudflare 已基本成为 Web 唯一入口
- 对 VPN / 动态 IP 的管理习惯兼容

### 第二部分：Cloudflare 基础防护

当前状态：

1. `Always Use HTTPS` 已开启
2. `Minimum TLS Version = 1.2`
3. `SSL = Full (strict)`
4. 免费托管规则已启用
5. 第一版 rate limit / custom firewall 已启用
6. 自定义防火墙已开始识别一部分明显脚本型采集器
7. 自定义防火墙已开始识别高价值数据页上的空 UA 请求

当前效果：

- Cloudflare 已不是“只有代理”
- 已具备基础托管安全层和轻量反爬层

### 第三部分：高价值页面反爬

#### A 组：最高优先级

- `/{locale}/players`
- `/{locale}/competitions/{slug}`
- `/{locale}/players/{slug}`

当前状态：

- 用一条总 rate limit 规则先兜住
- 当前免费层已落的是短时 burst 拦截，而不是细粒度 challenge
- 已额外对明显脚本 UA 补了一条低误伤 challenge
- 已额外对空 UA 补了一条低误伤 challenge
- 当前阈值已经调宽到更偏“只拦脚本爆刷”的级别
- 后续再按页面类型细化

#### B 组：中优先级

- `/{locale}/organizations`
- `/{locale}/competitions`

建议动作：

- 中等限速
- 先观察后收紧

#### C 组：观察组

- `/{locale}/organizations/{slug}`
- `/sitemap.xml`

建议动作：

- 先观测
- 异常后单独增强

---

## 为什么这些页面最值得保护

### 1. `/{locale}/players`

这是人物资产的系统化采集入口。

它支持：

- 关键词检索
- 多筛选条件组合
- 翻页遍历

而且后端会执行：

- 组织辅助查询
- 人物总数统计
- 人物分页查询
- memberships 与 PB 聚合查询

所以它兼具：

- 高数据价值
- 高枚举便利性
- 较高查询成本

### 2. `/{locale}/competitions/{slug}`

这是比赛结果资产的高密度详情页。

特别是：

- `tab=team-results`
- `tab=snapshots`
- `tab=race-units`

这些分支非常适合按比赛逐页采集结构化结果。

### 3. `/{locale}/players/{slug}`

这是人物资料的高价值详情页。

单页会输出：

- 所属
- PB
- 近比赛结果
- 来源
- 相关人物关系

非常适合定向抓“核心人物资料库”。

---

## 第一版不建议做的事情

以下内容第一版不建议优先投入：

- 全站验证码
- 全站强挑战
- 大量手写复杂规则
- 先做很细的地区封锁
- 先做非常激进的直接封禁策略

原因：

- 会增加误伤
- 会增加维护复杂度
- 对当前这个站型，收益通常不如入口收口和定向防护

---

## 推荐落地顺序

### 阶段 1：先把入口收紧

优先做：

1. 确认 `3000` 的用途并收口
2. 让 `80/443` 只接受 Cloudflare 流量
3. 收紧 SSH 登录层

完成后收益：

- Cloudflare 才真正有资格成为防护主入口

### 阶段 2：补 Cloudflare 基础安全

优先做：

1. `Always Use HTTPS`
2. `Minimum TLS Version = 1.2`
3. `SSL = Full (strict)`
4. 挂上免费托管规则
5. 开第一版 rate limit / challenge

完成后收益：

- 从“有代理”升级为“有基础安全层”

### 阶段 3：做高价值页面定向反爬

优先做：

1. 先用总规则兜住高价值数据页
2. 单独补 `sitemap.xml` 目录入口保护
3. 再按 `players` 与 `competitions/{slug}` 做更细分层

完成后收益：

- 直接保护核心数据资产输出入口

### 阶段 4：观察后微调

重点观察：

- 哪些 URL 被高频访问
- 是否存在异常 query string 穷举
- 是否存在短时间内访问大量 slug 的模式
- 是否误伤正常用户或搜索引擎

---

## 最终建议

如果要把这版方案压缩成一句话，就是：

`先堵住源站直连和裸露端口，让 Cloudflare 真正成为入口；再用 Cloudflare 的 WAF、基础 bot 防护、限速和 Managed Challenge，重点保护 players 与 competitions 这类高价值数据页面。`

对 `tasuki-keifu` 这样的个人数据站，这是一版最平衡的路线：

- 安全收益明显
- 维护复杂度可控
- 不会一上来把正常访问体验搞坏

---

## 公开数据站的现实边界

对 `tasuki-keifu` 这样的公开数据站，需要接受一个现实：

- 很难彻底阻止一个有耐心、愿意慢慢采集的人
- 尤其在 AI 已经能帮助理解页面结构、清洗结果和适配页面变化的情况下
- 因此防护目标不应该是“绝对防住”，而应该是“挡住低质量爬虫、提高中等质量爬虫成本、保护最核心资产”

这意味着后续策略应当遵循：

1. 继续保留基础安全底座
2. 优先保护高价值、高成本、高结构化的数据入口
3. 不为了追求绝对防爬而大幅伤害正常用户体验
4. 接受慢速、伪装良好的采集无法完全杜绝

---

## 后续可落地方案

在已经完成的 Cloudflare / AWS 基础收口之上，后续真正值得继续投入的，是“简单但有效”的应用层与规则层增强，而不是更花哨的重型方案。

### 1. 基础层继续保留

这部分已经落地，后续主要保持：

- Cloudflare-only 的 Web 入口
- `Full (strict)` 与托管规则
- SSH 纯公钥登录
- 宽松总 rate limit 作为爆刷兜底
- `sitemap.xml`、明显脚本 UA、空 UA 的 challenge

这层不需要频繁变动。

### 2. 应用层最值得做的基础增强

这部分是后续最推荐继续投入的方向。

优先级建议如下：

1. `players` 列表页限制搜索参数
   - 对过短 `q` 不执行模糊搜索
   - 限制最大页码
   - 继续保持非法筛选值归一化
2. 降低列表页单次响应的数据密度
   - 列表页尽量以“发现入口”为主
   - 不在列表页一次吐太多衍生信息
3. 强化高价值详情页缓存
   - `players/[slug]`
   - `competitions/[slug]`
4. 对高成本分支做更谨慎处理
   - 特别是 `competitions/{slug}` 里的 `race-units`

这类改动的目标不是阻止访问，而是：

- 让批量采集效率下降
- 让源站成本下降
- 让真正高价值数据更难一次性搬空

### 3. 规则层继续细化的原则

如果后续还要继续加 Cloudflare 规则，建议只沿着这两个方向走：

1. 低误伤脚本特征
   - 明显脚本 UA
   - 空 UA
   - 目录入口异常访问
2. 高价值路径更细分层
   - `players`
   - `competitions/{slug}`
   - `race-units`

不建议继续走的方向：

- 把总 rate limit 阈值继续压低
- 做大面积全站 challenge
- 为了防爬而把正常浏览体验搞差

### 4. 当前不建议优先做的事

以下事项目前可以明确放在后面：

- 基于固定 IP 的 SSH 白名单
  - 当前用户网络条件不适合
- 全站验证码
  - 误伤大，收益低
- 重型前端反爬花活
  - 易被绕过，维护成本高
- 为了“完全防住”而引入复杂架构
  - 与当前站点阶段不匹配

---

## 现在之后的建议节奏

这份方案落地后，更建议按下面节奏推进：

1. 先观察
   - 看 Cloudflare 安全事件
   - 看是否还有误伤
   - 看命中最多的是哪些路径
2. 再补应用层基础限制
   - 优先从 `players` 列表页开始
3. 最后按真实采集模式再细化 Cloudflare 规则

当前更适合的下一项开发工作，不是继续大改边缘配置，而是做：

`players / competitions` 相关的应用层轻反爬与缓存优化。
