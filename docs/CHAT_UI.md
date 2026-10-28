# Chat UI — Gap Product Guru client

How the React client is put together: routes, the two Zustand stores, the `useChat` lifecycle, every
UI state a turn can be in, Markdown rendering, and the styling rules that keep antd and Tailwind
cooperating. **Source of truth:** `client/src/`.

---

## Layout and routes

Routes (`constants/routes.ts`):

- `/` — a new chat (nothing saved yet) — `pages/ChatPage.tsx`
- `/c/:conversationId` — a saved conversation — `pages/ChatPage.tsx`
- `/share/:shareId` — a shared conversation, read-only — `pages/SharedConversationPage.tsx`
- `/admin` — feedback on answers — `pages/AdminPage.tsx` (see [Admin panel](#admin-panel))

Both chat routes render the same component type, so React keeps the instance when a new chat's URL
is replaced with `/c/<id>` mid-stream — the stream is not interrupted.

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

| Store                 | Holds                                                                                                                                                                         |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `store/chat`          | `conversationId` (null = unsaved new chat), `turns`, `stage`, `error`, `loadStatus`, `area` (product filter, kept across chats), `replyTo` (quote waiting above the composer) |
| `store/conversations` | Sidebar list (`ConversationSummary[]`, newest first), `listStatus`                                                                                                            |

A **turn** is a question plus its answer (`ChatTurn`), matching how the server stores messages in
pairs. It also carries `answerId` (the saved assistant message — set by the `answerId` stream frame or
from history), `feedback` (this browser's own) and `replyTo`. API calls live in hooks, never in stores
(regionify rule).

## Answer actions, replies, product filter, sharing

- **Under each saved answer** (`AnswerActions`, hidden while streaming and in shared views), three
  icon-only buttons with tooltips, in this order:
  - **👍 helped** — toggles (`PUT`/`DELETE /api/messages/:id/feedback`).
  - **🚩 report** — opens `ReportModal` (optional note, up to 2,000 chars); reporting again edits
    the note and reopens the report. Switching between 👍 and 🚩 replaces the earlier feedback.
  - **Reply** (last) — sets `replyTo` to the text selected _inside that answer_, or the whole answer
    if nothing is selected (`toReplyQuote`, capped at 1,500 chars). The button's `onMouseDown`
    prevents default so clicking it does not clear the selection. The composer shows the quote
    (× or Escape cancels) and focuses itself; the quote is sent as `replyTo` (+ `replyToId`, the
    answer it came from) and shown in the question bubble. **Clicking that quote scrolls to the
    quoted answer** (`scrollToAnswer`: answer cards carry `id="answer-<messageId>"`) and flashes a
    ring around it. Replies saved before `replyToId` existed show the quote but are not clickable.
- **Product filter** (`AreaSelect`, in the composer's bottom bar) — "All products" or one top-level
  wiki section from `GET /api/docs/areas`; sent as `area` with each question. It stays selected
  when switching chats.
- **Share** (header, saved chats only) — creates a **snapshot** link like ChatGPT/Gemini: later
  messages are not included, and each "Create link" makes a new one. The link is copied when the
  Clipboard API is available (secure contexts); otherwise it stays selectable in the dialog.
  `/share/:id` shows the turns read-only with **Continue this conversation**, which copies them into
  the visitor's own sidebar (their follow-ups never touch the original).

## Admin panel

`/admin` lists **open reports**, **resolved reports** and **"helped" votes** (newest 200 per view,
counts in the tabs). Each card shows the question, the reporter's note and the answer with its cited
sources; reports can be resolved and reopened. Feedback stores its own copy of the question, answer
and sources, so a report stays readable after the user deletes the conversation.

⚠️ **The panel and `/api/admin/*` are open** — there is no login (decision, 2026-10-28). Anyone who
knows the URL can read every question that was reported or rated. Fine on an internal network; put
it behind company sign-in (or at least a key) before the app is reachable from outside.

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
  textarea matches it on mouse focus too, so it shows on every click). Borderless `Select`s get the
  same outline when their search input has focus. The composer's textarea and `AreaSelect` turn it
  off with `outline-none!`; the composer's `focus-within:ring-*` is the focus indicator.
- **CentraNo2 has no 600 weight** (only 100–500, 700–900), so `font-semibold` and antd's default
  selected-option weight (600) render as **bold**. Use `font-medium` (500); the antd theme sets
  `Select.optionSelectedFontWeight: 500`.
- Merge classes with `combineClassNames([...])`; hoist inline objects passed to antd props to
  module constants.
- Modals are always `centered` (viewport middle, not antd's default top offset), and `PageLoader`
  is `fixed inset-0` so every loading spinner sits in the middle of the viewport rather than of
  whatever area it is rendered in. It is `pointer-events-none`, so the sidebar stays usable.
- `Input.TextArea showCount` draws its "0 / 2000" counter **absolutely**, 22px below the field, so
  it takes no space: give the textarea `mb-6!` or the next element (e.g. a modal's footer buttons)
  covers the counter.

## UI copy

All strings are in `constants/chat.ts` (`CHAT_COPY`, `STAGE_LABELS`, `ERROR_TITLES`, `ERROR_COPY`).
There is no i18n — single-language internal tool; moving to i18next later means replacing these
constants with keys.
