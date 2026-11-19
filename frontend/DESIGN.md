# NetGenX frontend — design spec

The goal: a calm, trustworthy, **human-made** product in the style of Vercel / shadcn,
not an "AI-generated cyber dashboard". Someone in uniform, possibly stressed, pastes a
message they are worried about and needs a clear answer in plain words.

## 1. What to avoid (the "AI look")
- Neon/glowing gradients, glow shadows, glassmorphism, animated radar/HUD/scanlines, fake telemetry counters.
- ALL-CAPS mono labels like `[INPUT TEXT EVIDENCE]`, "TACTICAL", "CLASSIFIED", "NEURAL", "STATE-OF-THE-ART".
- Emoji in UI copy, decorative icons on every line, rainbow colour per section.
- Buzzword copy ("military-grade AI", "quantum", "autonomous"). Say what it does.
- Fake numbers or claims. Only state real facts (see §6).

## 2. Visual system
- **Tokens only.** Use shadcn/Tailwind tokens: `bg-background`, `bg-card`, `bg-muted`, `text-foreground`,
  `text-muted-foreground`, `border`, `ring`, `primary`. No hard-coded hex / slate / emerald classes.
- **Status colours** (only for risk, always with a text label): `success`, `warning`, `danger`, each with
  `-foreground` (text) and `-muted` (soft background). E.g. `bg-danger-muted text-danger-foreground border-danger/30`.
- Light and dark mode both must look right (ThemeProvider uses the `dark` class). Never assume dark.
- Type: Geist (`font-sans`), Geist Mono (`font-mono`) only for numbers, hashes, CIDs, code.
  Numbers that change or align: add `tabular`. Headings: `font-semibold`, sizes `text-2xl/3xl` for h1, `text-lg` for card titles.
- Layout: generous whitespace, `max-w-6xl` page column (PageShell does this), cards with `border` + subtle shadow
  (shadcn Card default). Radius from tokens (`rounded-lg/xl`); nested elements use a smaller radius than their parent.
- Icons: lucide-react, `size-4`, only where they aid scanning (buttons, list markers). Icon-only buttons need `aria-label`.
- Motion: subtle (opacity/transform, ≤200ms), none required. Respect `prefers-reduced-motion` (global CSS already does).

## 3. Components (already installed — import from `@/components/ui/...`)
alert, alert-dialog, avatar, badge, button, card, dialog, dropdown-menu, empty, field, input, input-group, item,
kbd, label, progress, radio-group, scroll-area, select, separator, sheet, skeleton, sonner (toast via `import { toast } from 'sonner'`),
spinner, table, tabs, textarea, toggle, toggle-group, tooltip.
Read a component file before using it if unsure of its API (they are in `src/components/ui`).

App components (`@/components/app/...`):
- `page-shell.jsx`: `PageShell({ title, header, footer, width: 'narrow'|'default'|'wide' })`, `PageHeading({ title, description, actions })`.
  Every page uses PageShell (or `useDocumentTitle(title)` from `@/hooks/use-document-title`) so the tab title is right.
- `site-header.jsx`: `SiteHeader({ links, actions, showAccount })` — logo, nav, theme toggle, account menu with Sign Out.
- `site-footer.jsx`, `logo.jsx` (`Logo`, `LogoMark`), `theme-toggle.jsx`.
- `risk-badge.jsx`: `RiskBadge({ score })` (text + colour), `RiskMeter({ score })` (score/100 + bar + 80 threshold tick).

Lib (`@/lib/...`):
- `api.js`: **all backend calls** (`api.loginUser`, `api.predict`, `api.analyzeConversation`, `api.escalate`, …) returning
  `{ ok, status, data }`. Use these; do not write raw `fetch` URLs in pages. `evidenceUrl(cid)` for IPFS links.
- `store.js`: `userStore`, `OtpStore` (zustand, same persisted keys as before).
- `risk.js`: `riskBand`, `BAND_LABELS`, `BAND_OUTCOME`, `CATEGORY_LABELS`, `CATEGORY_HINTS`, `ESCALATION_THRESHOLD`.
- `utils.js`: `cn()`.

## 4. Vercel web-interface guidelines (must follow)
Interactions
- Everything works with a keyboard; visible focus rings (shadcn defaults — don't remove outlines).
- Hit targets ≥ 24px (44px on touch for primary actions). Links are `<Link>`/`<a>`, actions are `<button>`.
- Loading buttons keep their label and show a `Spinner`; prevent double submit while pending.
- Destructive or irreversible actions (e.g. escalating, signing out with unsaved input) confirm only when it matters.
- State that should survive reload/share lives in the URL (e.g. active tab via `?tab=`), where reasonable.
- Menus/actions that open something further end with "…".
Forms
- Every input has a visible `<Label>` (use `Field`, `FieldLabel`, `FieldDescription`, `FieldError`).
- Enter submits single-field forms; use a real `<form onSubmit>`.
- Don't disable the submit button to signal "invalid" — let submit run and show inline errors next to fields; focus the first error.
- Correct `type`, `inputMode`, `autoComplete` (`email`, `current-password`, `new-password`, `one-time-code`, `name`, `username`).
- `spellCheck={false}` on emails, codes, IDs. Trim values before sending. Placeholders are examples ending with "…".
Content
- Design every state: empty, loading (Skeleton, no layout shift), error (what happened + how to fix), success.
- Status never by colour alone (RiskBadge already pairs text). Icons that convey meaning have labels.
- Handle long user content: `break-words`, `truncate` + title, `min-w-0` in flex rows.
- Curly quotes “ ” and the ellipsis character … in copy. Numerals for numbers ("3 messages").
- One `h1` per page, logical heading order. Use semantic elements (`nav`, `main`, `section`, `ol`).
Copy (Vercel style)
- Active voice, second person, short. Say what happens next. **Title Case** for buttons, tabs and headings
  ("Check Message", "Upload Chat History"), sentence case for body text and descriptions.
- Error messages explain how to fix ("Couldn’t reach the AI engine. Check that it’s running on port 5000, then try again.").
- No jargon in the user-facing parts (say "tamper-proof record" not "SHA-256 multihash on Ethereum"); technical
  detail can sit in a secondary "Details" area for officials and the panel.

## 5. Pages (route → file)
| Route | File | Notes |
|---|---|---|
| `/` | `src/pages/home.jsx` | Product landing page |
| `/auth` | `src/pages/auth.jsx` | Personnel sign in / register; CERT-Army official sign in + OTP |
| `/upload` | `src/pages/dashboard.jsx` | Check a message / chat history / file; result; escalation or guidance |
| `/chat` | `src/pages/guidance.jsx` | Guidance assistant (Gemini) for the last case + follow-up questions |
| `/officialpage` | `src/pages/official.jsx` | CERT-Army case list from the ledger |
| `/workflow`, `/explainer` | `src/pages/how-it-works.jsx` | One explainer page (replaces two animation pages) |
| `*` | `src/pages/not-found.jsx` | 404 |

The old implementations are in `src/assets/components/*.jsx`. **Read the old page first**: every behaviour
(API calls, navigation, stored state, flows, edge cases) must be preserved — only presentation and copy change.
Do not edit `src/App.jsx`, `src/main.jsx`, `src/App.css`, `src/lib/*`, `src/components/ui/*` or other agents' pages.

## 6. Facts you may state (true)
- Checks a single message, a whole chat history (WhatsApp Android/iPhone exports, Telegram JSON, CSV, or pasted text) or a file.
- Risk score 0–100. 80 or more: the case is handed to CERT-Army with full details. 40–79: personalised steps
  (Gemini, with a built-in fallback playbook). Below 40: no threat found.
- Evidence is stored on IPFS and its fingerprint recorded on a blockchain ledger (tamper-proof record).
- Detects honeytraps, phishing/fraud, malware, blackmail and information gathering (OPSEC).
- Works in English, Hinglish and Hindi (Devanagari). Other scripts: links, files and credential requests are still checked.
- Chat analysis looks at the whole conversation (how it progresses, whether someone keeps asking after you refuse).
- National cyber-crime helpline **1930**, **cybercrime.gov.in**.
Do not invent accuracy percentages, user counts, certifications or partner logos.

## 7. Done means
`npm run build` passes, `npx eslint <your files>` reports no errors in your files, the page works in light and dark,
at 375px and 1280px wide, with keyboard only.
