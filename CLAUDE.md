# Comunical SDK

## What This Is

Tier 1 (open-source, zero-knowledge) SDK for Comunical — a middleware layer for AI agent tool execution that enforces context-aware trust boundaries in multi-party interactions. Everything runs locally, no server.

## Architecture

See `../architecture-overview.md` for the full design document. Key concepts:

- **Two-layer defense**: grants (should this tool execute?) + JSONata transformations (what data should the LLM see?)
- **Single `access` field**: `"open" | "owner_only" | "explicit" | "implicit"` — no impossible states
- **Participant roles**: `"human" | "agent"` — agents are structurally excluded from granting access
- **Identity verification**: `"verified" | "assumed" | "unverified"` — constrains which access modes are allowed
- **Default closed**: fields not included in a JSONata transform don't exist in the output

## Project Structure

- `src/Types.ts` — Zod schemas + inferred TypeScript types (all primitives defined here)
- `src/Guard.ts` — `createGuard()` entry point, validates config with Zod
- `src/Context.ts` — `BoundContext` with `execute()` and `getAuditLog()`
- `src/engine/` — pipeline internals (GrantChecker, RuleMatcher, DisclosureResolver, Transformer, Executor)
- `src/grants/` — grant detection (ExplicitDetector, ImplicitDetector, Revocation)
- `src/match/` — JSONata match sugar compiler
- `src/builtins/` — pre-built policy rules (GoogleCalendar, Gmail)
- `src/audit/` — local structured audit logger
- `tests/` — mirrors `src/` structure, all written before implementation (TDD)

## Development

```bash
npm install          # install dependencies
npm test             # run all tests (vitest)
npm run typecheck    # tsc --noEmit
npm run build        # tsup → dist/ (ESM + CJS + .d.ts)
npm run format       # prettier
```

## Key Conventions

- Zod schemas define all types — `FooSchema` + `type Foo = z.infer<typeof FooSchema>`
- Prettier: 180 char width, 4-space indent, double quotes, no trailing commas
- Husky + lint-staged runs Prettier on pre-commit
- Tests use real JSONata evaluation, no mocks
- `npm` is the package manager (not yarn/pnpm)

## The Execute Pipeline

`context.execute(toolName, handler, params)` runs 6 steps:

1. Tool registration check (is it in the guard config?)
2. Identity verification (does sender's level permit this access mode?)
3. Grant check (owner_only/explicit/implicit — agents excluded)
4. Rule matching (JSONata expression, first match wins)
5. Disclosure resolution (lowest trust tier determines disclosure level)
6. Transformation (JSONata transform on handler output)
