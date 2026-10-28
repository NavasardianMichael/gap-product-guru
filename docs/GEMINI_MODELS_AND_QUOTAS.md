# Gemini Models and Quotas — Gap Product Guru

Which Gemini models the app uses and why, what the free tier allows, how every Gemini failure is
mapped to something the user or the ingest CLI can act on, and how to move to a paid key.
Facts below were checked on **2026-10-14** — model line-ups and quotas change; re-check the links.
**Source of truth:** `server/src/lib/gemini.ts`.

---

## Models

| Purpose    | Model (env var)                                 | Notes                                                                   |
| ---------- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| Embeddings | `gemini-embedding-2` (`GEMINI_EMBEDDING_MODEL`) | Free tier; 8,192-token input; 768 dims (auto-normalised); no `taskType` |
| Answers    | `gemini-3.8-flash` (`GEMINI_CHAT_MODEL`)        | Free tier; `thinkingLevel: LOW`                                         |

⚠️ **`gemini-2.5-flash` returns 404 for keys from new Google projects** ("no longer available to new
users", seen 2026-10-28). Older keys may still reach it, so a key change alone can break chat while
embeddings keep working. The default is therefore `gemini-3.8-flash`.

### Why not `text-embedding-004`?

The original brief asked for it, but Google **shut it down on 2026-01-14**
([deprecations](https://ai.google.dev/gemini-api/docs/deprecations)); `gemini-embedding-2` is the
named replacement. It has no `taskType` field, so queries and documents are marked with text prefixes
(see [INGESTION.md](./INGESTION.md#embedding-input-format)).

### Swapping the chat model

Set `GEMINI_CHAT_MODEL` (e.g. `gemini-3.8-flash`, `gemini-3.5-flash-lite` — both on the free tier).
It is **not** a pure rename: Gemini 3.x uses `thinkingLevel` instead of `thinkingBudget` (sending both
is a 400) and misbehaves at low temperatures. `buildGenerationConfig(model)` already branches on the
`gemini-2.5` prefix; check it when adopting a new family. Newer Flash models reportedly have much
smaller free daily quotas — compare in AI Studio before switching.

### Swapping the embedding model

Changing `GEMINI_EMBEDDING_MODEL` changes every document hash, so the next `pnpm ingest` re-embeds the
whole corpus (vectors from different models must never be mixed). If the new model needs a different
dimension, see [DATABASE.md](./DATABASE.md#changing-the-embedding-dimension).

## Free-tier limits

Google no longer publishes free-tier numbers in its docs; your project's real limits are on the
[AI Studio rate-limit page](https://aistudio.google.com/rate-limit). Third-party reports in 2026 range
from ~20 to ~1,500 requests/day for Flash models and ~100 RPM / 1,000 RPD for embeddings, so the app
assumes **tight and unknown** limits:

| Action        | Gemini calls                                         |
| ------------- | ---------------------------------------------------- |
| One question  | 1 embedding request + 1 generation request           |
| `pnpm ingest` | ⌈new chunks ÷ `EMBED_BATCH_SIZE`⌉ embedding requests |

Design consequences: no extra "rewrite the question" call per turn, resumable ingestion, our own
per-IP limit on `POST /api/chat` (`CHAT_RATE_LIMIT_PER_MINUTE`, default 10) so one tab can't drain the
shared quota, and an explicit UI for every 429. Daily quotas reset at **midnight Pacific time**.

## Error mapping

All SDK failures arrive as `ApiError` with an HTTP `status` and the JSON error body in `message`
(also for errors raised mid-stream, prefixed `got status: …`). `toAiError` turns them into `AppError`s:

| Gemini response                                        | `ErrorCode`          | Chat UI                              | Ingest CLI                     |
| ------------------------------------------------------ | -------------------- | ------------------------------------ | ------------------------------ |
| 429 with a `…PerDay…` quota id                         | `AI_QUOTA_EXHAUSTED` | "Daily limit reached", Retry enabled | Stops, progress saved          |
| 429 otherwise (`retryDelay` in RetryInfo, default 60s) | `AI_RATE_LIMITED`    | Countdown, Retry unlocks at 0        | Sleeps `retryDelay`, continues |
| 500 / 502 / 503 / 504 (after SDK retries)              | `AI_UNAVAILABLE`     | "Gemini is unavailable", Retry       | Fails                          |
| Message mentions "API key"                             | `AI_UNAVAILABLE`     | Same                                 | Fails                          |
| 60 s `REQUEST_TIMEOUT_MS` hit (`AbortError`)           | `AI_UNAVAILABLE`     | "did not respond in time", Retry     | Fails                          |
| Missing `GEMINI_API_KEY`                               | `AI_UNAVAILABLE`     | Same                                 | Fails                          |
| Our own limiter (not Gemini)                           | `RATE_LIMITED`       | Countdown from `retryAfterSeconds`   | —                              |

The daily-quota check runs **before** the retryDelay check because daily 429s carry a `retryDelay` too.
Unit tests: `server/src/lib/gemini.test.ts`.

### SDK retries

The client is created with `retryOptions: { attempts: 3, httpStatusCodes: [500, 502, 503, 504] }`.
The explicit status list matters: without it the SDK's default list includes 429, and it would
silently retry rate-limited calls — burning quota and hiding the wait from the user.

## Data use on the free tier

Per the [pricing page](https://ai.google.dev/gemini-api/docs/pricing), content sent on the free tier
may be used to improve Google's products. Every doc chunk (at ingest) and every question (at chat time)
goes to Gemini. Accepted for this project on 2026-10-14 because the docs are not sensitive.

## Going paid

Enable billing on the Google Cloud project behind the API key — no code change, same key. Paid-tier
content is not used for product improvement, and the limits jump by orders of magnitude. Embedding the
entire ~1M-token corpus costs well under a dollar at current embedding prices (check the pricing page).

## SDK version pin

`@google/genai` is pinned to `~2.25.0`. pnpm 11 refuses packages published in the last day
(`minimumReleaseAge`), and a version that has been public for a couple of weeks is the safer
supply-chain choice anyway. Bump it deliberately, run `pnpm test`, and smoke-test a chat.
