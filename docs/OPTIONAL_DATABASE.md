# Optional database and Render recovery

`DATABASE_OPTIONAL=true` (default) makes storage nonessential for file-backed
research endpoints. `/api/health` returns `status: healthy` and
`database: unavailable (optional)` on DNS failure, timeout or refused connection.
The database error remains visible without logging its credentials. This is not
a claim that persistence or database-backed features work while storage is down.
Set `DATABASE_OPTIONAL=false` when persistence is a deployment requirement;
startup then fails after exhausted retries and health reports degradation.

Optional startup initializes schema and ingestion in a background task: five
attempts, each bounded by `DATABASE_CONNECT_TIMEOUT=2`, with backoff 1, 2, 4, 8
seconds (configurable, capped at 30). Cancellation propagates during shutdown.
Ingestion runs only after successful initialization. Availability logs occur once
per transition per worker process, not once per health request. Health probes
continue to detect reconnection; after exhausted startup retries, restart the
service once storage is repaired to initialize schema and ingestion.

Render's official documentation confirms Free Postgres expires 30 days after
creation: https://render.com/docs/free (checked 2026-11-16).
Live read-only inspection found no Postgres instances in the selected workspace
and repeated DNS failures in ADAM backend logs. Expiration is a possible cause,
not a verified history of this particular database.

To restore persistence with an external provider:

1. Provision PostgreSQL (for example Neon or Supabase), obtain its external host,
   database and least-privilege credentials, and follow its TLS/network guidance.
2. In Render backend **Environment**, replace `DATABASE_URL` with its external
   connection string. Do not use a private Render-only hostname for an external DB.
   `postgres://` and `postgresql://` prefixes are normalized by the application.
   For asyncpg TLS use `postgresql+asyncpg://USER:PASSWORD@HOST:5432/DB?ssl=require`;
   percent-encode special characters in credentials. Do not commit the real URL.
   Provider-specific libpq parameters such as `sslmode`/`channel_binding` are not
   passed blindly to asyncpg: use the driver's supported connection options.
3. Enable pgvector if needed and permitted. Extension creation is isolated in
   savepoints. Reconnect/redeploy, inspect health for `database: connected`, and
   verify ingestion/schema; do not assume optional health means migration worked.
4. Restore an existing backup if necessary. A replacement URL cannot recover data
   deleted with an expired instance.

The repository branch does not change the live Render branch or its environment.
Both ADAM services currently follow `main`; merge/deploy separately after review.
