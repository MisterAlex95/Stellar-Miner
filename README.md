# Stellar Miner

Idle game built with TypeScript and a Domain-Driven Design (DDD) structure. Mine coins, buy upgrades on planets, hire crew, complete quests, trigger random events, and prestige.

**Vibecoded for fun** — this project is built for enjoyment and experimentation; keep the code playful and the scope flexible.

## Tech stack

- **TypeScript** (ES2022, strict)
- **Vite** — dev server and build
- **Vitest** — unit tests and coverage
- **Playwright** — E2E tests
- **ESLint** + **Prettier** — lint and format
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
| `npm run test:e2e` / `yarn test:e2e` | Run Playwright E2E tests (starts dev server) |
| `npm run lint` / `yarn lint` | Run ESLint on `src` |
| `npm run format` / `yarn format` | Format TypeScript with Prettier |

## Project structure

```
e2e/                  # Playwright E2E tests (smoke.spec.ts)
src/
├── domain/           # DDD core (entities, value-objects, aggregates, events, services, bigNumber)
├── application/      # gameState; handlers (handlers.ts + handlersSave, handlersMine, handlersUpgrade,
│                     # handlersPlanet, handlersQuest, handlersPrestige, handlersResearch,
│                     # handlersSettings, handlersDebug); catalogs, quests, progression, stats,
│                     # format, eventBus, strings (i18n t(key)), research, achievements, milestones,
│                     # planetAffinity, version, changelog
├── presentation/     # mount; tabs: Mine, Empire, Research, Upgrades, Stats; views + components
├── infrastructure/   # SaveLoadService (save/load/export/import, version, validateSavePayload)
├── data/             # JSON: upgrades, events, research, achievements, progression, planetAffinity, changelog
├── settings.ts       # User settings: starfield, layout, pause when background, theme, sound, reducedMotion
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

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — DDD overview, layered architecture, code references, **§12 Game rules** (objectives, mine click, combo, upgrades, crew, planets, events, quests, prestige, offline, milestones, achievements).
- [docs/PROGRESSION_CURVE.md](docs/PROGRESSION_CURVE.md) — Economy reference: upgrade costs, progression unlocks, astronaut/planet/slot/housing formulas, milestones, prestige (aligned with balance.json).
- [docs/IDEAS.md](docs/IDEAS.md) — Backlog of gameplay ideas for future features.
- **AI / Cursor** — Project rules for assistants live in `.cursor/rules/` (stellar-miner-project.mdc, typescript-conventions.mdc).

## Implemented improvements

1. **Accessibility** — ARIA on tabs/modals, keyboard (1–4 for tabs, Tab trap in modals, Escape to close), focus on first focusable when opening modals, **Reduce motion** setting + `data-reduced-motion` CSS.
2. **Error handling** — Save retry once on failure, `isSavedSession` validation before deserialize, **Offline banner** when `navigator.onLine` is false.
3. **Performance** — Stats history writes only when a new point is recorded; **requestIdleCallback** for stats panel updates in the game loop.
4. **Testing** — **Playwright** E2E in `e2e/` (smoke + tabs); unit tests for **eventBus** and **gameState**.
5. **i18n** — **`src/application/strings.ts`** with `t(key)`; used for invalid save message and offline banner.
6. **Settings** — **Theme** (light/dark), **Sound effects** toggle, **Reduce motion**; all persisted in `settings.ts`.
7. **Save format** — **`version: 1`** in payload, **`isSavedSession()`** type guard, migration for legacy (no version); **`SAVE_VERSION`** and **`validateSavePayload()`** in SaveLoadService.
8. **DevEx** — **ESLint** (`.eslintrc.cjs`) + **Prettier** (`.prettierrc`), scripts **`lint`** and **`format`**.
9. **Docs** — README and ARCHITECTURE kept in sync (this section and §11–12 in ARCHITECTURE).
10. **Observability** — **`src/application/eventBus.ts`** (subscribe/emit for upgrade_purchased, prestige, quest_claimed, planet_bought, astronaut_hired, session_loaded, save_success, save_failed); **performance.mark** in game loop and save.

## License

Private project.
