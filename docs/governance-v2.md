# Data governance observability

The `/[locale]/observability` page is a read-only projection of the new `governance` schema. Set `TASUKI_GOVERNANCE_READ_DATABASE_URL` to a same-database PostgreSQL role that has SELECT on governance records and the business reference tables. The app does not fall back to the legacy Agent database URL. No write capability is used.

Both the page and `/api/observability/*` require HTTP Basic Authentication. Configure `OBSERVABILITY_USERNAME` and `OBSERVABILITY_PASSWORD` as deployment secrets. If either value is missing, the paths return 404; invalid credentials receive 401. Use a unique, strong password and serve only over HTTPS. This guard is scoped to observability paths and does not change the rest of the public site.

The deployment secret is `TASUKI_GOVERNANCE_READ_DATABASE_URL`; add/update it in the hosting workflow settings before deploying this version. The GitHub Actions workflow writes it to the app's runtime environment, and Compose forwards it to the Next.js container. The role must not have SELECT on `UserFeedback`, checkpoint state, or business tables outside the explicit projection.

The dashboard lists the latest 20 event tasks and, for one selected task, up to 300 batches and 100 executions, findings, changes, and notification deliveries. It exposes summary counts, node name, LLM/network/token/time metrics, finding reasons and cited URLs, limited before/after diffs, business AuditLog references, and mail delivery status. It does not select the raw manifest, payload location, full change patches, prompts, secrets, or LangGraph checkpoints.

If the URL is absent the page reports that the read connection is not configured after authentication. Query failures return an unavailable state rather than falling back to a different database.

For local development, put `TASUKI_GOVERNANCE_READ_DATABASE_URL`, `OBSERVABILITY_USERNAME`, and `OBSERVABILITY_PASSWORD` in the ignored `.env.local`; `.env.example` contains only variable names and no credentials. Production deployment requires updating the GitHub Actions secrets before the next deploy; no deployment or secret mutation was performed during this implementation.
