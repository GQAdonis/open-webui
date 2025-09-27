# Repository Guidelines

This guide helps contributors and tooling (agents) work consistently in this repo.

## What We’re Building (from docs/)
- Artifact‑first chat UX: detect, stream, and render AI‑generated “artifacts” (code, UIs, diagrams) inline with an auto‑opening preview panel.
- Supported artifacts: React and Svelte components, HTML/CSS/JS, SVG, Mermaid, plus safe sandboxes for execution/rendering.
- Core architecture: a streaming parser + FSM, artifact dependency resolver, and sandboxed renderers (CodeMirror/Sandpack, Pyodide worker for Python).
- Quality targets: fast detection (<100ms), resilient recovery on network interruptions, no memory leaks, and comprehensive E2E/perf coverage.
- Security: sanitize HTML/SVG, strict CSP patterns, and isolated execution contexts.
- Key references: `docs/ARTIFACT_SYSTEM_ARCHITECTURAL_DECISIONS.md`, `docs/ARTIFACT_PREVIEW_IMPLEMENTATION_PLAN.md`, `docs/ARTIFACT_INTEGRATION_IMPLEMENTATION_PLAN.md`, `docs/artifacts-technical-specification.md`, `docs/INTENT_CLASSIFIER_AND_ARTIFACT_PROMPT_TEMPLATE.md`.

## Project Structure & Module Organization
- Frontend (SvelteKit): `src/` (routes, lib, components), static assets in `static/`.
- Backend (FastAPI): `backend/` (package `open_webui/`, scripts, requirements).
- Tests: `tests/` (Playwright E2E, helpers), `src/**/?(*.)test.{ts,js}` for unit/integration.
- Config: root `package.json`, `svelte.config.js`, `tailwind.config.js`, Docker files, `Makefile`.

## Build, Test, and Development Commands
- Install: `npm install` (Node >=18.13 <=22.x).
- Frontend dev: `npm run dev` (http://localhost:5173) — auto fetches Pyodide.
- Backend dev: `cd backend && ./dev-fixed.sh` (http://localhost:8080).
- Build: `npm run build` (Vite/SvelteKit production build).
- Type check: `npm run check`; Lint: `npm run lint`; Format: `npm run format`.
- Unit tests: `npm run test:unit`; E2E: `npm run test:e2e`; Full: `npm run test:all`.
- Docker compose: `make start` / `make startAndBuild` (optional, see Makefile).

## Coding Style & Naming Conventions
- Frontend: TypeScript + Svelte, 2‑space indent via Prettier. Run `npm run lint` and `npm run format` before PRs. Components: `PascalCase.svelte`; utilities: `camelCase.ts`.
- Backend: Python 3.11+. Format with Black (`npm run format:backend`), lint with Pylint (`npm run lint:backend`). Modules use `snake_case.py`.

## Testing Guidelines
- Frameworks: Vitest (unit/integration), Playwright (E2E). Backend uses PyTest where applicable.
- Naming: colocate frontend tests near code (`*.test.ts`) or under `tests/` for E2E.
- Run locally: `npm run test:unit`, `npm run test:e2e`, or artifact suites (`npm run test:artifacts`). Aim to keep tests deterministic and fast.

## Commit & Pull Request Guidelines
- Use concise prefixes seen in history: `feat`, `fix`, `refac`, `chore`, `doc`, `security` (e.g., `fix: handle null model id`).
- PRs must include: purpose summary, linked issues (`Closes #123`), test plan, and screenshots/GIFs for UI changes.

## Security & Configuration Tips
- Never commit secrets. Copy `backend/.env.example` to `backend/.env` and set API keys.
- Default ports: frontend 5173, backend 8080. CORS is preconfigured in dev.

## Agent-Specific Instructions
- Scope: These rules apply repo‑wide. Prefer minimal, focused patches; do not introduce unrelated changes.
- Follow existing style (Prettier/ESLint, Black/Pylint). Keep file paths and public APIs stable.
- Update or add tests for changed behavior; avoid adding new dependencies without discussion.
