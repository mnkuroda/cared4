# cared4

Simple pet-care check-ins for when you’re out of town and neighbors or family are helping.

Live site: https://mnkuroda.github.io/cared4/

## What it does

- **Check in** — name, auto date/time, task, optional note
- **Activity** — shared log of who did what
- **Schedule** — trip dates with care times and multiple tasks per time
- **Share** — copy a link/code so helpers see the same live household

## Cloud setup (required for sharing)

1. Create a free project at [supabase.com](https://supabase.com)
2. In **SQL Editor**, paste and run `supabase/schema.sql`
3. In **Database → Replication**, enable Realtime for `households`, `check_ins`, and `trips`
4. In **Project Settings → API**, copy the Project URL and `anon` `public` key
5. Locally, copy `.env.example` to `.env` and fill those values:

```bash
cp .env.example .env
```

6. For GitHub Pages, add repository secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Run locally

```bash
npm install
npm run dev
```

## How helpers use it

1. Owner creates a household and taps **Copy share link**
2. Text/email the link to neighbors
3. They open it, enter their name, and log care
4. Everyone sees updates live
