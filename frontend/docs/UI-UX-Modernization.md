# Frontend UI/UX Modernization — Summary of Changes

This document captures what landed in the modernization sprint and how to use the
new primitives. The original 30-day plan (see `Frontend UI-UX Modernization Roadmap.xlsx`)
was implemented in 10 incremental, build-verified bits.

---

## Foundations

### Design tokens
All visual atoms are CSS variables on `:root` and `.dark`, exposed to Tailwind v4 via
`@theme inline` in [src/app/globals.css](../src/app/globals.css). Reads:

- **Brand**: `--primary` (deep AA-passing teal `oklch(0.55 0.075 197)` light / bright
  teal `oklch(0.74 0.10 198)` dark), `--brand`, `--brand-bright`, `--brand-soft`.
- **Surfaces**: `--background`, `--card`, `--popover`, `--muted`, `--secondary`, `--accent`.
- **Semantic**: `--success`, `--warning`, `--info`, `--destructive` (each with `-foreground`).
- **Lines**: `--border`, `--input`, `--ring`.
- **Radius**: `--radius` (0.75rem) plus computed `sm/md/lg/xl/2xl`.

In Tailwind use them as: `bg-primary`, `text-success`, `bg-brand-soft`, `ring-ring`.
Never hardcode hex/rgb in src/components — semantics first.

### Typography
[Geist Sans + Mono](https://vercel.com/font) loaded via `next/font` in
[src/app/layout.tsx](../src/app/layout.tsx). Mapped to `--font-sans` / `--font-mono`
in `@theme inline`, applied via `font-sans` on `<body>`.

### Theme switching
`next-themes` ThemeProvider in [src/components/Providers.tsx](../src/components/Providers.tsx)
with `attribute="class"`, `defaultTheme="system"`, `disableTransitionOnChange`. The
[src/components/layout/ThemeSwitcher.tsx](../src/components/layout/ThemeSwitcher.tsx) renders as
either a segmented Light/System/Dark control (default) or a single icon-cycle button (`compact`).
A compact one is wired into the dashboard topbar.

### Motion
- Tokens (durations + easings) and pre-built `Variants` in [src/lib/motion.ts](../src/lib/motion.ts).
- Drop-in primitives in [src/components/ui/motion.tsx](../src/components/ui/motion.tsx):
  `<FadeIn>`, `<SlideUp>`, `<SlideDown>`, `<SlideLeft>`, `<SlideRight>`, `<ScaleIn>`, `<Pop>`,
  `<StaggerList>` + `<StaggerItem>`, `motion`, `AnimatePresence`.
- `<MotionConfig reducedMotion="user">` wraps the tree, so OS-level prefers-reduced-motion
  is honored automatically. The legacy CSS keyframe utilities also respect this via a
  `@media (prefers-reduced-motion: reduce)` block in `globals.css`.

---

## Components

### Atomic primitives (`src/components/ui/`)
- **`button.tsx`** — 9 variants (default/secondary/outline/ghost/soft/destructive/success/warning/link),
  7 sizes (sm/default/lg/xl/icon-sm/icon/icon-lg), `block`, `loading` (overlay spinner with
  hidden label), `leadingIcon` / `trailingIcon`, `asChild`, full forwardRef. AA-aware focus ring.
- **`input.tsx`** — token-driven, h-10, hover/focus/aria-invalid states, dark surfaces.
- **`card.tsx`** — `variant` (default/elevated/flat/glass/outline), `density`
  (comfortable/compact), `interactive` (hoverable + focus ring).
- **`badge.tsx`** — 12 variants including soft tones (`successSoft`, `warningSoft`, etc.),
  3 sizes, supports `asChild`.
- **`skeleton.tsx`** — token-driven, ARIA `role="status"`.
- **`empty-state.tsx`** — icon + title + description + action, the "no data" surface.

### Overlays
- **`sonner.tsx`** — themed sonner Toaster (follows next-themes), drop-in in `layout.tsx`.
  Replaces `react-hot-toast` everywhere; the `toast` API is API-compatible
  (`toast.success`, `toast.error`, `toast.loading`, `toast.dismiss`).
- **`sheet.tsx`** — responsive `<Sheet>` + `<SheetContent>` + `<SheetTrigger>`.
  Auto-detects mobile (< 768px) via `useMediaQuery`: renders as a vaul bottom drawer
  with rubber-band + swipe-to-dismiss. On desktop, renders as a Radix Dialog with
  side-slide animation. Same API both modes.

### Navigation
- **[CommandPalette.tsx](../src/components/layout/CommandPalette.tsx)** — cmdk-powered
  Cmd-K palette with Navigation / Quick actions / Preferences groups, fuzzy search,
  keyboard-only navigation, accessible Radix dialog shell.
- **[MobileNav.tsx](../src/components/layout/MobileNav.tsx)** — bottom-tab nav
  (5 tabs, safe-area aware, `aria-current` on active). Auto-hides on `lg` and up.
- **DashboardLayout** — topbar Search input replaced with a Cmd-K trigger button (+ kbd
  hint). Cmd/Ctrl+K listener attached at the layout level. Main pads `pb-20` on mobile so
  content isn't covered by the bottom nav.

### Auth
- **[AuthLayout.tsx](../src/components/layout/AuthLayout.tsx)** — shared chrome for the
  `(auth)` route group: hero panel + form column, mobile-aware, dark-mode-aware, optional
  back button + footer, semantic `<aside>` / `<main>` landmarks.
- Refactored: signin, get-started, verify-otp, forgot-password. All hex literals removed,
  proper labels + autocomplete + inputMode hints, OTP screen has paste support, arrow-key
  navigation, and `autocomplete="one-time-code"` for SMS suggest.

### Dashboard / Wallet / Community / Settings
- **Dashboard** ([src/app/dashboard/page.tsx](../src/app/dashboard/page.tsx)) — composer
  in a Card with proper density, ad-hoc Input replaced with semantic button, mobile
  right-rail manual drawer replaced with the responsive `<Sheet>`.
- **Wallet** — `WalletBalanceCard` rebuilt: token-driven gradient (`from-brand`),
  hide-balance with `aria-pressed`, `aria-live="polite"` on the balance, 4 quick actions
  in a clean grid (Fund / Send / Withdraw / Account). `RecentTransactions` rebuilt: Card
  shell, real Skeleton-list while loading, EmptyState when no rows, semantic
  `<ul role="list">` rows with directional icons, `tabular-nums`, status `Badge` with
  status dots.
- **Community** — `CommunityCard` as semantic `<article>`, Badge primitive for cover
  pills, Button primitive replacing inline join button (with `loading` state).
- **Settings** — `SettingsSidebar` as `<nav>`, `aria-current="page"` on the active item,
  proper Card variants, dedicated `border-destructive` "Danger zone" Card. All hex
  literals removed, dark-mode aware.

---

## Accessibility

- Tokens chosen for AA contrast: `--primary` light/dark each pass 4.5:1 against their
  `-foreground` partners (verified via WCAG luminance math).
- `prefers-reduced-motion` honored globally via `<MotionConfig reducedMotion="user">`
  AND a CSS `@media` block neutralizing the legacy keyframe utilities.
- Focus rings: `focus-visible:ring-2 ring-ring ring-offset-2 ring-offset-background` on
  every interactive primitive.
- Skip-able heuristic improvements: semantic landmarks (`<nav>`, `<main>`, `<aside>`,
  `<article>`), `aria-current` for active routes, `aria-label` on icon-only buttons,
  `aria-hidden` on decorative SVGs/images, `role="status"` on skeletons / empty states,
  `role="separator"` on visual dividers.
- Dev-mode `@axe-core/react` boots from `Providers.tsx` (dynamic import — never enters
  the production bundle). Open the browser console in `npm run dev` to see live
  violations as you navigate.

---

## How the work is structured (for follow-on bits)

The tokens + primitives form the foundation. Any future screen redesign should:

1. **Use tokens, not literals.** No `bg-[#0E9DA5]`, no `text-gray-500`. Use `bg-primary`,
   `text-muted-foreground`. If you can't express it in tokens, add a token first.
2. **Lean on primitives.** New buttons → `<Button>`. New surfaces → `<Card variant>`.
   New mobile dialogs → `<Sheet side="bottom">`. New pills → `<Badge variant>`. New
   "no rows" → `<EmptyState>`.
3. **Mobile checklist per screen**: 360px width, no horizontal scroll, thumb-zone CTAs,
   safe-area-aware fixed bars, `<Sheet>` instead of `<Dialog>` where presentation matters.
4. **a11y checklist per screen**: real labels (not just placeholders), `aria-label` on
   icon-only buttons, focus rings visible, semantic landmarks, `aria-current` on active
   nav items, `aria-live` on values that change.

---

## Tech stack additions in this sprint

| Package | Purpose | Where |
|---|---|---|
| `next-themes` | Dark mode + system preference + persistence | `Providers.tsx` |
| `geist` | Modern type pairing (Sans + Mono) via `next/font` | `layout.tsx` |
| `framer-motion` | Motion system + reduced-motion config | `Providers.tsx`, `motion.ts/tsx` |
| `sonner` | Modern toast (replaces `react-hot-toast`) | `ui/sonner.tsx`, `layout.tsx` |
| `vaul` | Mobile drawer / bottom sheet (native feel) | `ui/sheet.tsx` |
| `cmdk` | Command palette | `layout/CommandPalette.tsx` |
| `@axe-core/react` (dev) | A11y violations in dev console | `Providers.tsx` (lazy) |

`react-hot-toast` removed. `sonner` is API-compatible for the common cases.
