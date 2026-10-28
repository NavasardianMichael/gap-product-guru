# Chat UI — Gap Product Guru client

How the React client is put together: routes, the two Zustand stores, the `useChat` lifecycle, every
UI state a turn can be in, Markdown rendering, and the styling rules that keep antd and Tailwind
cooperating. **Source of truth:** `client/src/`.

---

## Layout and routes

One page, `pages/ChatPage.tsx`, on two routes (`constants/routes.ts`):

- `/` — a new chat (nothing saved yet)
- `/c/:conversationId` — a saved conversation

Both routes render the same component type, so React keeps the instance when a new chat's URL is
replaced with `/c/<id>` mid-stream — the stream is not interrupted.

```
┌─────────────── md and up ────────────────┐   < md: the sidebar becomes a Drawer
│ ConversationSidebar │ ChatHeader          │   opened from the ☰ button in ChatHeader
│  New chat           │ ChatThread          │
│  conversation list  │   ChatTurnItem × n  │
│                     │ ChatErrorAlert?     │
│                     │ ChatComposer        │
└─────────────────────┴─────────────────────┘
```

## State

| Store                 | Holds                                                                               |
| --------------------- | ----------------------------------------------------------------------------------- |
| `store/chat`          | `conversationId` (null = unsaved new chat), `turns`, `stage`, `error`, `loadStatus` |
| `store/conversations` | Sidebar list (`ConversationSummary[]`, newest first), `listStatus`                  |

A **turn** is a question plus its answer (`ChatTurn`), matching how the server stores messages in
pairs. API calls live in hooks, never in stores (regionify rule).

## `useChat(routeConversationId)` lifecycle

- **URL changes** → if it names the conversation already on screen, nothing happens (this is the
  "new chat just got its id" case); otherwise abort any stream, then reset (for `/`) or fetch and show
  the conversation. A failed load shows a toast and goes home.
- **`ask(question)`** → one stream at a time; appends a `streaming` turn and feeds SSE frames into
  the store (`status` → `stage`, `sources`, `delta` → answer text, `notice`, `conversation` → sidebar
  upsert + URL replace for new chats).
- **`stop()`** → aborts; the turn becomes `stopped`.
- **`retry()`** → removes the failed turn and asks again (safe: failed turns were never saved).
- **`startNewChat()`** → aborts, resets, navigates to `/`.

## Turn states

| `status`    | Shows                                                                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `streaming` | Before text: `ChatStatus` spinner + "Searching the documentation…" / "Writing the answer…" (`aria-live`). With text: Markdown + blinking caret. |
| `done`      | Markdown answer, optional notice, cited sources                                                                                                 |
| `stopped`   | Partial answer + "Stopped — this answer was not saved."                                                                                         |
| `failed`    | "No answer — see the message below." + `ChatErrorAlert` above the composer                                                                      |

`ChatErrorAlert` titles come from `ERROR_TITLES` (`constants/chat.ts`). Rate limits
(`RATE_LIMITED`, `AI_RATE_LIMITED`) count down `retryAfterSeconds` before Retry unlocks; the alert is
re-mounted for each error (the error is cleared when a question is sent), which restarts the countdown.
Network failures (fetch rejected, or the dev proxy returned a non-JSON error) use the client-only code
`NETWORK_ERROR`.

## Rendering answers

- `MarkdownMessage` = `react-markdown` + `remark-gfm` (tables, strikethrough, task lists) +
  `rehype-highlight` (highlight.js, `github-dark` theme), styled with Tailwind Typography (`prose`).
  react-markdown never renders raw HTML from the model, so no sanitiser is needed.
- `CodeBlock` replaces `<pre>`: language label, Copy button, dark background. It sits in `not-prose`
  so Typography doesn't restyle it; its CSS is in `styles/markdown.css`.
- Links open in a new tab; wide tables scroll horizontally.
- `SourceList` shows only the sources the answer cites (`[n]`), as `heading` + `path`; the heading
  links to the wiki page (new tab) when the source has a `url`.
- Every `[n]` citation in the answer is a link to the same page (`remarkCitationLinks`, built per
  turn from its sources in `MarkdownMessage`), with the page title on hover.
- The thread follows the stream to the bottom unless the user scrolled up (`useStickToBottom`); a new
  question always jumps back down.

## Anonymous identity

`helpers/clientId.ts` creates a UUID once and keeps it in `localStorage`
(`gap-product-guru:client-id`); every request sends it as `X-Client-Id`. Clearing site data starts a
fresh, empty history. `crypto.randomUUID` and the Clipboard API only exist in **secure contexts**
(https or localhost): over plain-http LAN access the UUID falls back to `crypto.getRandomValues` and
the Copy button is hidden.

## Styling rules

- Tailwind 4 via `@tailwindcss/vite`; tokens in `styles/tailwind.css` (`@theme`): brand purple
  `--color-primary` `#59315f` (ClientWorldUI's breakthrough-executive colour), CentraNo2 font.
- antd 6 theme in `styles/antd-theme.ts` uses the same purple and font. The font itself comes from
  Gap's `kit.css` linked in `index.html`.
- **antd components reset padding/margin with unlayered CSS, which beats Tailwind 4's layered
  utilities.** Spacing classes on antd components therefore need the `!` suffix: `px-4!`, `p-2!`
  (regionify convention). Plain elements (`div`, `button`) don't need it.
- antd 6 gives `variant="borderless"` inputs a primary-colour **outline on `:focus-visible`** (a
  textarea matches it on mouse focus too, so it shows on every click). The composer's textarea
  turns it off with `outline-none!`; its container's `focus-within:ring-*` is the focus indicator.
- Merge classes with `combineClassNames([...])`; hoist inline objects passed to antd props to
  module constants.

## UI copy

All strings are in `constants/chat.ts` (`CHAT_COPY`, `STAGE_LABELS`, `ERROR_TITLES`, `ERROR_COPY`).
There is no i18n — single-language internal tool; moving to i18next later means replacing these
constants with keys.
