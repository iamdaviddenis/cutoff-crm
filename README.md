# CutOff Recycle CRM

AI-powered CRM for CutOff Recycle Limited — tracks Sales, Supply, and Distributor leads with WhatsApp AI follow-up generation.

## Features
- **Sales leads** — farmers buying Rutubisha, Vuna, McheKuza
- **Supply leads** — hair collectors (individual & agents) by region
- **Distributor leads** — agrovets & fertilizer shops
- **AI follow-up messages** — paste WhatsApp chat, AI reads and drafts replies
- **Weekly report** — AI-generated summary every Friday
- **Collection center routing** — auto-shows nearest hub (Dar, Kilimanjaro, Arusha)
- **Target region alerts** — Tanga & Manyara highlighted

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set API key
```bash
cp .env.example .env
```
Edit `.env` and add your Anthropic API key from https://console.anthropic.com

### 3. Run locally
```bash
npm start
```

### 4. Deploy to Vercel

**Option A — Vercel CLI:**
```bash
npx vercel
```

**Option B — Vercel Dashboard:**
1. Push this repo to GitHub
2. Go to https://vercel.com/new
3. Import your repo
4. Add environment variable: `REACT_APP_ANTHROPIC_API_KEY` = your key
5. Deploy

## Project structure
```
src/
  App.js          — main UI & components
  App.css         — all styles
  constants.js    — products, regions, centers, demo data
  utils.js        — helpers, AI call function
  index.js        — entry point
  index.css       — global styles
```

## Updating collection centers
Edit `src/constants.js` → `COLLECTION_CENTERS` object.

## Adding new regions
Edit `src/constants.js` → `REGIONS` array and `COLLECTION_CENTERS`.
