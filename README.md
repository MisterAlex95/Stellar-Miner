# Stellar Miner

Idle game built with TypeScript and a Domain-Driven Design (DDD) structure. Mine coins, buy upgrades, trigger events, and prestige.

## Tech stack

- **TypeScript** (ES2022, strict)
- **Vite** — dev server and build
- **Vitest** — tests and coverage
- **tsx** — run TypeScript directly

## Setup

```bash
npm install
```

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run start` | Run `src/main.ts` with tsx |
| `npm run typecheck` | TypeScript check (no emit) |
| `npm run test` | Run Vitest once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run tests with coverage |

## Project structure

```
src/
├── domain/           # DDD core
│   ├── entities/     # Player, Upgrade, GameEvent, Artifact
│   ├── value-objects/# Coins, ProductionRate, UpgradeEffect, EventEffect
│   ├── aggregates/   # GameSession
│   ├── events/       # CoinsMined, UpgradePurchased, EventTriggered, PrestigeActivated
│   └── services/     # UpgradeService, EventService, PrestigeService
├── application/      # Use cases and orchestration
├── presentation/     # UI entry
├── infrastructure/   # SaveLoadService, persistence
├── main.ts           # Domain sanity check / CLI entry
├── game.ts           # Game bootstrap
└── index.ts          # Main entry
```

## CI / CD

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and PR to `main` or `master`:

- **Install** — `npm ci` with Node 20 and dependency cache
- **Typecheck** — `npm run typecheck`
- **Tests** — `npm test`
- **Coverage** — `npm run test:coverage` (artifact uploaded for 7 days)
- **Build** — `npm run build` with `BASE_PATH` set to your repo name (e.g. `/stellar-miner/`) for GitHub Pages
- **Deploy** — on push to `main`/`master` only, deploys `dist/` to GitHub Pages

To use GitHub Pages: in the repo **Settings → Pages**, set **Source** to “GitHub Actions”. The site will be at `https://<user>.github.io/<repo>/`. If the repo name has spaces, set `BASE_PATH` in the workflow or use a repo name without spaces.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — DDD overview: domains, entities, value objects, aggregates, services, events, and layered architecture.

## License

Private project.
