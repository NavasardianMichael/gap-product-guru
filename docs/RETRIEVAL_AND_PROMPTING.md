# Retrieval and Prompting — Gap Product Guru

What happens between "user presses Enter" and "Gemini starts writing": how the relevant docs are
found, exactly what the model is told, how citations work, and which knobs to turn when answers are
off. **Source of truth:** `server/src/services/chatService.ts` and `server/src/services/chatPrompts.ts`.

---

## Retrieval

1. **Query text** — the question itself. If it is a short follow-up (fewer than 12 words), the previous
   question is prepended: "How do I install on Windows?\nand on Mac?". See _Follow-ups_ below.
2. **Embed** with `gemini-embedding-2` as `task: search result | query: …` (768 dims).
3. **Search** — `ORDER BY embedding <=> query LIMIT RAG_TOP_K` (cosine distance, exact scan) in
   `chunkRepository.searchSimilar`. `score = 1 − distance` (higher is more similar).
4. If no chunk has a vector at all, the stream fails with `DOCS_NOT_INDEXED` instead of calling Gemini.

There is **no similarity threshold**: the top K are always sent and the system prompt makes the model
say when they don't contain the answer. A threshold sounds tidy but cosine scores vary by model and
corpus; a wrong cut-off silently drops good context. Add one only after looking at real scores.

Debug what was retrieved: run the server with `LOG_LEVEL=debug` and look for `retrieval results`
(path, heading and score of every hit).

### Follow-ups without an extra LLM call

"and on Mac?" embeds to something generic and retrieves noise. The textbook fix is a "condense the
question" LLM call before retrieval — rejected here because every call counts against the free daily
quota and adds latency. Prefixing the previous question to _short_ follow-ups recovers most of the
benefit for free. Weak spots: a short question that changes topic is diluted by the old one, and a
follow-up to a follow-up only sees one question back. Revisit if users report it.

## What the model sees

`generateContentStream` gets:

- **`systemInstruction`** (`buildSystemPrompt`) — fixed per deployment:
  answer only from the `<source>` blocks; say plainly when the docs don't cover it and never invent
  features or steps; cite `[n]` after each supported sentence, only numbers from the latest message;
  Markdown with numbered steps and fenced, language-tagged code; lead with the direct answer.
  `PRODUCT_NAME` (env) is interpolated into it.
- **`contents`** — the last `CHAT_HISTORY_TURNS` (default 3) stored question/answer pairs as
  `user`/`model` turns, then a final `user` turn built by `buildUserPrompt`:

  ```
  <sources>
  <source n="1" path="guides/install.md" heading="Installation › Windows">
  …chunk content…
  </source>
  …
  </sources>

  Question: and on Mac?
  ```

Design choices:

- **Sources only in the latest turn.** Earlier turns replay just the plain question and answer, so the
  prompt doesn't grow with every turn's 4k tokens of context.
- **Old `[n]` markers are stripped from replayed answers** — those numbers referred to that turn's
  sources and would mislead the model now.
- **Generation config** comes from `buildGenerationConfig` (`lib/gemini.ts`): Gemini 2.5 → temperature
  0.2, thinking off (`thinkingBudget: 0`) for a fast first token; Gemini 3.x → `thinkingLevel: LOW`
  and default temperature. `maxOutputTokens` 4096.

## Citations

The server sends every retrieved chunk as `sources` (`n`, path, title, heading, url, score) and stores
them on the assistant message. The client's `SourceList` shows **only the numbers the answer actually
cites** — showing all eight would suggest the answer used them. When the model ends early, the
`finishReason` becomes a notice under the answer: `MAX_TOKENS` (cut off), `SAFETY`, or `RECITATION`
(quoted the docs too literally — asking for a summary usually works).

### Links to the wiki

Each source carries `url`, its page in the Azure DevOps wiki (`lib/docLinks.ts`):
`<DOCS_WEB_URL>?pagePath=/<page path>`, where each file-path segment is decoded the way the wiki
encodes names (`-` → space, then percent-decoding, so `%2D` → `-`; `_` stays). The wiki's own URLs
use a page id (`…/GAP-International.wiki/833/Qualtrics-Print-functionality`), but ids are not in the
git repo — only the REST API knows them — while `pagePath` resolves to the same page from the file
path alone. `url` is rebuilt when history is read, so old messages pick up a changed `DOCS_WEB_URL`.
It points at the page, not the heading.

The client links both places a source appears: the heading in `SourceList`, and every `[n]` in the
answer (`helpers/remarkCitationLinks.ts`, a remark plugin — it rewrites text nodes only, so `items[1]`
in code is never touched; numbers without a source stay plain text). Answers can also contain the
wiki's own root-relative links (`[x](/Page-Name)`); those still open against the app and are not
rewritten yet.

## Tuning knobs

| Knob                                      | Default | Effect                                                       |
| ----------------------------------------- | ------- | ------------------------------------------------------------ |
| `RAG_TOP_K` (env)                         | 8       | More context per answer vs. more tokens and more noise       |
| `CHAT_HISTORY_TURNS` (env)                | 3       | How much conversation the model remembers                    |
| `FOLLOW_UP_MAX_WORDS` (`chatPrompts.ts`)  | 12      | Which questions borrow the previous one for retrieval        |
| `CHUNK_MAX_TOKENS` (`markdownChunker.ts`) | 500     | Chunk granularity — needs `CHUNKER_VERSION` bump + re-ingest |
| System prompt (`buildSystemPrompt`)       | —       | Tone, strictness, citation style                             |

## When answers are bad — checklist

1. **Was the right section retrieved?** `LOG_LEVEL=debug`, ask again, read `retrieval results`.
   - Not retrieved → the chunk may be mislabelled or too big/small: inspect it in the `chunks` table;
     consider a higher `RAG_TOP_K`.
   - Retrieved but ignored → tighten the system prompt.
2. **Is it a follow-up?** Try asking the full question standalone.
3. **Is the doc actually indexed?** `SELECT path FROM documents WHERE path LIKE '%name%';`
