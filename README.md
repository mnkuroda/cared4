# cared4

Simple pet-care check-ins for when you’re out of town and friends or family are helping.

## What it does

- **Check in** — enter your name, pick a task (fed cats, let dogs out, etc.), time is recorded automatically
- **Activity** — shared log of who did what and when
- **Schedule** — set trip dates and daily care times/tasks for helpers

## Run locally

```bash
npm install
npm run dev
```

## Notes

Right now each household is stored in the browser (`localStorage`). That’s fine for trying the app on one device. For helpers on other phones to see the same live log and schedule, we should add free cloud sync next (e.g. Supabase).
