# Streaming Protocol — `POST /api/chat`

The wire contract between `server/src/routes/chat.ts` and `client/src/api/chat/index.ts`: request,
the SSE frames and their order, how errors and aborts behave, and the gotchas that shaped it.
Types: `ChatStreamFrame` / `ChatStreamError` in `shared/src/types/chat.ts`.

---

## Request

```http
POST /api/chat
Content-Type: application/json
X-Client-Id: 3f0c…-uuid        # anonymous per-browser id

{ "conversationId": "uuid (optional — omit to start a new chat)", "message": "1–4000 chars" }
```

It is a POST (the question can be long), so the browser's `EventSource` cannot be used — the client
reads the response body with `fetch` + `ReadableStream` and parses SSE itself.

## Errors before the stream (normal JSON)

These are checked before any SSE header is sent, so they arrive as regular envelope errors:

| Status | `error.code`       | When                                                                 |
| ------ | ------------------ | -------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR` | Missing / invalid `X-Client-Id`                                      |
| 422    | `VALIDATION_ERROR` | Body fails `chatRequestSchema` (`details` per field)                 |
| 404    | `NOT_FOUND`        | `conversationId` unknown or belongs to another browser               |
| 429    | `RATE_LIMITED`     | Our per-IP limiter; body has `retryAfterSeconds`, plus `Retry-After` |

## Frames (status 200, `text/event-stream`)

Each event is one line `data: <payload>` followed by a blank line. Exactly one key per JSON payload:

| Frame                                              | When                                                         |
| -------------------------------------------------- | ------------------------------------------------------------ |
| `{"status":"retrieving"}`                          | Before embedding the question                                |
| `{"sources":[{n,path,title,heading,url,score},…]}` | After vector search (always before any delta)                |
| `{"status":"generating"}`                          | Before calling Gemini                                        |
| `{"delta":"text"}`                                 | Many — append in order                                       |
| `{"notice":"text"}`                                | Optional — Gemini stopped early (length, safety, recitation) |
| `{"conversation":{id,title,updatedAt}}`            | The turn was saved; carries the new id for a new chat        |
| `[DONE]` (literal, not JSON)                       | Success — last frame                                         |
| `{"error":{code,message,retryAfterSeconds?}}`      | Failure after headers were sent — last frame (no `[DONE]`)   |

Example:

```
data: {"status":"retrieving"}

data: {"sources":[{"n":1,"path":"guides/installation.md","title":"Installation Guide","heading":"Installation","url":"https://dev.azure.com/…/_wiki/wikis/….wiki?pagePath=%2Fguides%2Finstallation","score":0.71}]}

data: {"status":"generating"}

data: {"delta":"To install on **Windows**, "}

data: {"delta":"run the installer [1]."}

data: {"conversation":{"id":"0ebc…","title":"How do I install on Windows?","updatedAt":"2026-10-14T11:09:41.072Z"}}

data: [DONE]
```

Error frames carry the same codes as JSON errors (`AI_RATE_LIMITED`, `AI_QUOTA_EXHAUSTED`,
`AI_UNAVAILABLE`, `DOCS_NOT_INDEXED`, `INTERNAL_ERROR`) — see
[GEMINI_MODELS_AND_QUOTAS.md](./GEMINI_MODELS_AND_QUOTAS.md#error-mapping). regionify sent a bare string
here; a code is needed so the UI can show a countdown instead of a generic failure.

## Saving happens at the end

The question and the answer are written **together, after the answer completes** (one transaction,
which also creates the conversation for a new chat). Consequences:

- A failed or stopped turn leaves nothing in the database, so **Retry never duplicates a question**,
  and stored history always alternates user → assistant.
- A new chat has no id until its first answer finishes — hence the `conversation` frame; the client
  then replaces the URL with `/c/<id>`.
- Stopping the very first answer of a new chat leaves no conversation at all; the partial answer stays
  on screen marked "Stopped — this answer was not saved."

## Aborts and disconnects

The server watches **`res.on('close')`** and, if the response has not finished, aborts an
`AbortController` whose signal is passed to Gemini (`abortSignal`). The generator then stops, nothing
is saved, and the log shows `chat stream aborted by client`.

⚠️ Not `req.on('close')`: for a POST, Node emits `close` on the request as soon as its body has been
consumed — long before the client goes away. Using it (as regionify's `pumpAiStream` does) either
aborts every stream immediately or, with async middleware in front, never fires at all.

The client aborts with its own `AbortController` (Stop button, switching conversations, New chat);
the resulting `AbortError` is not shown as an error.

## Proxies and buffering

- The response sets `Cache-Control: no-cache` and `X-Accel-Buffering: no` (stops nginx buffering).
- Never add `compression()` without excluding `text/event-stream` — it holds frames back until a
  buffer fills, which looks like a frozen answer.
- Vite's dev proxy (`/api → :9005`) streams SSE fine; verified, including disconnects.

## Client parser notes (`client/src/api/chat/index.ts`)

Copied from regionify's `consumeAiStream`, with fixes:

- keeps a partial event in a buffer across reads (events are split on blank lines);
- processes a final event even if the stream ends without a trailing blank line;
- calls `reader.cancel()` after `[DONE]` or an error frame;
- a stream that ends without `[DONE]` or `error` is treated as a failure, not a success;
- non-2xx responses are parsed into the same coded `ApiRequestError` as error frames.
