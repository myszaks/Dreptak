# Dreptak 👟

> Rywalizuj ze znajomymi na kroki. Fun, memy, trash talk.

A production-ready social step-tracking challenge app built with Next.js 15, Supabase, and TypeScript.

## Features

- 📸 **OCR step extraction** — upload a screenshot from Apple Health / Google Fit / Samsung Health
- 🏆 **Leaderboards** — real-time ranking with animated podium
- 😈 **Janusz Mode** — last place gets a penalty voted on by the group
- 🔥 **Reactions** — react to others' entries with emojis (🔥💀🐌🤡👑)
- 📱 **PWA** — install to home screen, works offline
- 🇵🇱 **Polish trash talk** — auto-generated roasts in Polish

## Regression checklist (stability + performance)

Use this checklist after each deployment/hotfix:

- [ ] **Challenge details load** (`/challenges/[slug]`)
  - ✅ fixed: ranking/feed renders or shows retry fallback within ~12s
  - ❌ not fixed: spinner/pending state never resolves
- [ ] **Create challenge flow** (`/challenges/create`)
  - ✅ fixed: create ends with redirect to new challenge or explicit error toast
  - ❌ not fixed: submit button stays loading without resolution
- [ ] **Save steps flow** (`/upload` and challenge detail upload)
  - ✅ fixed: save ends with success or explicit error within timeout window
  - ❌ not fixed: save stays pending indefinitely
- [ ] **Join by code flow** (`/challenges/join` and `/join/{CODE}`)
  - ✅ fixed: both routes resolve to join success/error and support auth redirect back
  - ❌ not fixed: `/join/{CODE}` is 404/blocked or does not prefill/autojoin
- [ ] **Navigation speed** (`/home` ↔ `/challenges` ↔ `/upload` ↔ `/challenges/[slug]`)
  - ✅ fixed: transitions are responsive and avoid forced heavy refetch on mount
  - ❌ not fixed: visible pauses caused by repeated full refetch + re-render bursts
- [ ] **Member counts consistency**
  - ✅ fixed: same participant count source on home/list/detail and refresh after joins
  - ❌ not fixed: home/detail shows stale or inconsistent counts vs challenges list
- [ ] **Late-join backfill**
  - ✅ fixed: after joining active challenge, historical daily entries within challenge dates are included
  - ❌ not fixed: pre-existing same-day/date-range steps are missing from challenge

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 3 + shadcn/ui
- **Database**: Supabase (PostgreSQL + Realtime + Storage)
- **Auth**: Supabase Auth (Google OAuth)
- **State**: Zustand + TanStack Query v5
- **OCR**: Tesseract.js v6
- **Animations**: Framer Motion v12
- **PWA**: next-pwa

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-username/dreptak
cd dreptak
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Go to **Storage** and create a bucket named `screenshots` (public)
4. Go to **Authentication → Providers** and enable **Google OAuth**
   - Add your Google OAuth credentials (Client ID + Secret)
   - Set redirect URL to `https://your-domain.com/auth/callback`

### 3. Configure environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)

### One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/dreptak)

### Manual deploy

1. Push to GitHub
2. Import project in [vercel.com/new](https://vercel.com/new)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (your Vercel domain, e.g. `https://dreptak.vercel.app`)
4. Deploy

### Supabase setup for production

After deploying, update:
1. Supabase → Authentication → URL Configuration → **Site URL** = `https://your-domain.com`
2. Supabase → Authentication → URL Configuration → **Redirect URLs** → add `https://your-domain.com/auth/callback`
3. Google OAuth console → Authorized redirect URIs → add `https://your-supabase-project.supabase.co/auth/v1/callback`

## Project Structure

```
src/
├── app/
│   ├── (app)/          # Authenticated routes (with bottom nav)
│   │   ├── home/
│   │   ├── challenges/
│   │   ├── upload/
│   │   ├── profile/
│   │   ├── notifications/
│   │   └── settings/
│   ├── auth/           # Login page + OAuth callback
│   ├── onboarding/     # New user setup
│   └── api/og/         # OG image generation
├── components/
│   ├── ui/             # Base UI components (shadcn-style)
│   ├── challenge/      # Challenge-specific components
│   ├── leaderboard/    # Podium + leaderboard rows
│   ├── navigation/     # Bottom nav
│   └── upload/         # OCR upload flow
├── hooks/              # React Query hooks
├── lib/
│   ├── supabase/       # Supabase clients
│   ├── ocr.ts          # Step extraction logic
│   ├── trash-talk.ts   # Polish trash talk generator
│   └── utils.ts        # Utilities
├── store/              # Zustand store
└── types/              # TypeScript types
supabase/
└── schema.sql          # Full DB schema with RLS
```

## PWA Icons

The app expects icons in `public/icons/`:
- `icon-192.png` (192×192)
- `icon-512.png` (512×512)  
- `apple-touch-icon.png` (180×180)

Generate them from a 1024×1024 source image using [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator) or [RealFaviconGenerator](https://realfavicongenerator.net).

## License

MIT
