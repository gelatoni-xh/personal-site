---
title: "Tasuki Keifu: Cloudflare and AWS Security Plan"
date: "2026-10-12"
category: "个人项目"
summary: "A measured origin-access and anti-scraping plan, separating verified controls from optional Cloudflare and application-layer improvements."
published: true
---

# Cloudflare and AWS Security Plan

This document combines three concerns: origin access, baseline Cloudflare protection, and targeted defenses for data-rich `tasuki-keifu` pages. The aim was a simple, maintainable security baseline for a personal data site, improving resistance to direct-origin access, scanning, and bulk scraping without imposing a heavy enterprise security program. “Completed” below means verified at the time of the source document; later changes should be checked against current infrastructure.

## 1. Observed State

### Cloudflare

At the time, `tasukikeifu.com` and `www` were proxied through Cloudflare. Confirmed settings included Security Level `medium`, Browser Check enabled, SSL `Full (strict)`, HTTP/3, TLS 1.3, Automatic HTTPS Rewrites, Always Use HTTPS, a minimum TLS version of 1.2, and Cloudflare's free managed ruleset. A first rate-limit rule and two custom rules applied Managed Challenge to obvious script user agents and empty user agents on high-value data pages. A separate challenge on `/sitemap.xml` had been removed on July 5 to avoid disrupting Search Console and other SEO tools. Verified search-engine bots were intended to remain accessible.

This provided a baseline and light anti-scraping layer, with intentionally conservative rules that could later be refined by page type.

### AWS Origin

Production ran on AWS Lightsail `Ubuntu-3`. Lightsail exposed port 22 publicly; ports 80 and 443 admitted only Cloudflare IPv4/IPv6 ranges; port 3000 was closed to the public. Nginx listened on ports 80 and 443. The `personal-site` container listened on port 3000, while the Tasuki application itself listened on `127.0.0.1:3020`.

The source recorded live checks: `https://tasukikeifu.com/ja` and `https://gelatoni.uk/articles` returned HTTP 200, while direct connections to the origin's ports 80 and 443 timed out. Thus Cloudflare had become the effective web entry point and bypassing it over those public ports was substantially harder. The article intentionally does not publish the origin IP address.

### Application Surface

The project had no obvious public `/api` routes; core data was primarily emitted by server-rendered pages. The most valuable routes for systematic collection were:

1. `/{locale}/players`
2. `/{locale}/competitions/{slug}`
3. `/{locale}/players/{slug}`
4. `/{locale}/organizations`
5. `/{locale}/competitions`
6. `/sitemap.xml`, which also needs to remain usable for indexing

## 2. Risks and Operating Principles

**SSH scanning:** Port 22 still admitted traffic from the internet. Password and direct root login had been disabled, and public-key/PEM access had been retested, reducing the risk compared with password login. The public SSH surface still warranted monitoring or a future access-control option.

**Bulk collection:** Search, filters, pagination, and predictable slugs make athlete and competition records enumerable. Some pages expose substantial data per response and require relatively expensive database and server work.

**Coarse first rules:** The first anti-scraping layer used one broad rate limit across data pages. Directory-level challenges had been relaxed to preserve SEO access. Finer page-specific limits remained an option.

The design principles were to close the origin entry path first, then tune rules; protect data-rich routes according to value and cost; preserve a normal public browsing experience; and favor low-maintenance WAF, rate limits, and Managed Challenge over sitewide CAPTCHAs. Existing proxy, TLS, Browser Check, and `nginx -> 127.0.0.1:3020 -> tasuki-keifu` settings could remain because they supported this goal without obvious visitor friction.

## 3. Completed First Baseline

### Origin Entry

The first pass closed public port 3000 and limited public 80/443 traffic to Cloudflare IP ranges. Direct-origin tests on those web ports timed out, while both the data site and `gelatoni.uk` still worked through their domains. This reduced the public web bypass route without disrupting the other site on the same host.

### Cloudflare Transport and Managed Rules

Always Use HTTPS, minimum TLS 1.2, SSL Full (strict), and the free managed ruleset had been enabled. This made HTTPS handling more consistent and validated the edge-to-origin certificate more strictly.

### Rate Limiting and Lightweight Challenges

One rule covered paths containing `/players`, `/competitions`, or `/organizations`, with a then-current threshold of **400 requests in 10 seconds** and a short block action. It excluded `cf.client.bot`. Custom firewall rules applied Managed Challenge to obvious script user agents and empty user agents on high-value pages. The `/sitemap.xml` challenge was removed on July 5 to preserve a standard public SEO entry point.

The source reported that this blocked obvious burst scraping and challenged common scripted traffic without apparent harm to the home page or normal site access. It did not claim complete protection from slower collectors.

### SSH Configuration

The host was configured with `PermitRootLogin no`, `PasswordAuthentication no`, `KbdInteractiveAuthentication no`, and `PubkeyAuthentication yes`. Existing public-key/PEM login was retested. Port 22 remained available, avoiding a fixed-IP allowlist that could lock out the maintainer when working over a VPN or changing networks.

## 4. Optional Next Steps

The remaining origin option was to narrow SSH access further once a stable administration route existed. Certificate renewal could be revisited later to align cleanly with the Cloudflare-only model. Bot and WAF rules could be layered more precisely after observing real traffic.

For anti-scraping, the broad rule could be split into a `players` policy and a separate `competitions/{slug}` policy, especially for `tab=race-units`. Directory and detail pages have different data value and costs, so they need not share identical limits. This was proposed future work, not part of the verified first pass.

## 5. Route Priority

| Group | Routes | Intended treatment |
| --- | --- | --- |
| A: highest | `/{locale}/players`, `/{locale}/competitions/{slug}`, `/{locale}/players/{slug}` | Broad rate-limit baseline already applied; refine by route after observation |
| B: medium | `/{locale}/organizations`, `/{locale}/competitions` | Observe and consider moderate limits |
| C: observe | `/{locale}/organizations/{slug}`, `/sitemap.xml` | Watch first; strengthen only when evidence warrants it, particularly preserving sitemap accessibility |

`/{locale}/players` is a particularly useful enumeration entry point because it combines keyword search, multiple filters, and pagination. Backend work includes organization-assist queries, a person count, a paged person query, and membership and personal-best aggregation. It therefore combines data value, easy enumeration, and query cost.

`/{locale}/competitions/{slug}` is a dense results page. Its `team-results`, `snapshots`, and `race-units` tabs expose structured information that can be collected edition by edition. `/{locale}/players/{slug}` puts affiliations, personal bests, recent results, sources, and related athletes on one page, making it valuable for targeted profile collection.

## 6. Sequence and Validation

The intended order was:

1. **Close entry paths:** understand port 3000's role, restrict 80/443 to Cloudflare, and harden SSH login. These were reported as completed.
2. **Add Cloudflare basics:** enforce HTTPS and minimum TLS, use Full (strict), enable free managed rules, and add a first rate limit and challenge. These were also reported as completed.
3. **Protect high-value routes:** start with a broad rule, then differentiate `players` and competition details. Challenge clearly malicious user agents rather than broadly challenging the sitemap.
4. **Observe and tune:** inspect high-frequency URLs, query-string enumeration, rapid traversal of many slugs, and any false positives for visitors or search engines.

The first version did not prioritize sitewide CAPTCHA, sitewide strong challenges, many handwritten rules, broad geographic blocking, or aggressive block policies. These would increase maintenance and false positives relative to their likely value for this site.

## 7. Limits of Protection on a Public Data Site

A patient collector can still gather public pages slowly, especially with tools that adapt to page structure. The realistic goal is to stop low-effort bots, raise the cost of medium-scale scraping, protect expensive data routes, and keep normal visitors and indexing functional. Absolute prevention is not a sound target for a public site.

The completed baseline should remain: Cloudflare-only web entry, Full (strict) and managed rules, SSH public-key-only login, a loose burst limit, and challenges for suspicious user agents. Further work should focus on high-value application paths.

The most useful proposed application changes were to avoid fuzzy searches for very short `q` values on the player list, cap pagination depth, normalize invalid filters, reduce the amount of derived data emitted on list pages, cache expensive `players/[slug]` and `competitions/[slug]` views, and handle competition `race-units` more carefully. Those changes would reduce origin load and bulk collection efficiency without barring legitimate reads.

Further Cloudflare rules should focus on low-false-positive script signals or finer protection for `players`, competition details, and race units. Lowering the broad threshold, applying sitewide challenges, using a fixed SSH IP allowlist under unstable network conditions, or adding brittle front-end anti-scraping mechanisms were not recommended at that stage.

The next practical rhythm was to inspect Cloudflare security events and false positives, add modest application limits starting with the player list, then refine edge rules based on real collection patterns. The source identified application-level limits and caching for players and competitions as the next development priority.
