# Stellar Miner

Idle game built with TypeScript and a Domain-Driven Design (DDD) structure. Mine coins, buy upgrades on planets, hire crew, complete quests, trigger random events, and prestige.

## Tech stack

- **TypeScript** (ES2022, strict)
- **Vite** — dev server and build
- **Vitest** — tests and coverage
- **tsx** — run TypeScript directly

## Setup

```bash
npm install
# or
yarn install
```

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` / `yarn dev` | Start Vite dev server |
| `npm run build` / `yarn build` | Production build |
| `npm run preview` / `yarn preview` | Preview production build |
| `npm run start` / `yarn start` | Run `src/main.ts` with tsx |
| `npm run typecheck` / `yarn typecheck` | TypeScript check (no emit) |
| `npm run test` / `yarn test` | Run Vitest once |
| `npm run test:watch` / `yarn test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` / `yarn test:coverage` | Run tests with coverage |

## Project structure

```
src/
├── domain/           # DDD core
│   ├── entities/     # Player, Planet, Upgrade, GameEvent, Artifact
│   ├── value-objects/# Coins, ProductionRate, UpgradeEffect, EventEffect
│   ├── aggregates/   # GameSession
│   ├── events/       # CoinsMined, UpgradePurchased, EventTriggered, PrestigeActivated
│   ├── services/     # UpgradeService, PlanetService, EventService, PrestigeService
│   └── constants.ts  # Planet names, costs, prestige/crew bonuses
├── application/      # gameState, handlers, catalogs, quests, progression, stats, format
├── presentation/     # mount, stats/upgrade/planet/quest/combo/progression/prestige/crew views, toasts, StarfieldCanvas, MineZoneCanvas
├── infrastructure/   # SaveLoadService (save/load/export/import, offline progress)
├── settings.ts       # User settings (starfield, layout, pause when background, etc.)
├── main.ts           # Domain sanity check / CLI entry
├── game.ts           # Game bootstrap and loop
└── index.ts          # Library entry (domain + infrastructure)
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

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — DDD overview: domains, entities, value objects, aggregates, services, events, layered architecture, current flows, and code references.
- [docs/IDEAS.md](docs/IDEAS.md) — Backlog of gameplay ideas for future features.

## Planned improvements (roadmap)

1. **Accessibility** — ARIA labels, keyboard navigation, focus management, reduced-motion support.
2. **Error handling** — Centralized save/load handling, payload validation, optional retry, offline indicator.
3. **Performance** — Throttle stats writes, batch DOM updates, requestIdleCallback for non-critical UI.
4. **Testing** — E2E (e.g. Playwright) for critical paths; more unit tests for application layer.
5. **i18n** — Extract UI strings for future localization.
6. **Settings** — Document persisted settings; consider sound and theme options.
7. **Save format** — Version field, migration path, validation before deserialize.
8. **DevEx** — ESLint, Prettier, optional pre-commit hooks.
9. **Docs** — Keep ARCHITECTURE and README in sync with code.
10. **Observability** — Optional performance marks and event bus for key actions.

## License

Private project.
