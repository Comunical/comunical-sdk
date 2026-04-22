# @comunical/sdk

Middleware for AI agent tool execution — context-aware trust boundaries in multi-party interactions.

## What It Does

When an AI agent operates in a group context — a shared channel, a multi-party thread, a collaborative workspace — it sits between humans with different trust levels and permissions. Comunical enforces trust boundaries *structurally*, not *behaviorally*. If information shouldn't be available, it never enters the context window.

## Install

```bash
npm install @comunical/sdk
```

## Quick Start

```typescript
import { comunical } from "@comunical/sdk";

// 1. Create a guard with tool access modes and policy rules
const guard = comunical.createGuard({
    // default_access defaults to "owner_only" — most restrictive
    tools: {
        search: { access: "open" },        // no grant needed
        calendar: {},                       // owner_only (default)
        email: { access: "explicit" },      // requires owner confirmation
        memory: { access: "implicit" }      // inferred from owner intent
    },
    policies: {
        rules: [
            comunical.builtins.googleCalendar,
            comunical.builtins.gmail
        ]
    }
});

// 2. Bind to a conversation context
const context = guard.withContext({
    context_type: "group",
    identity_verification: "assumed",
    participants: {
        "jim@acme.com": { role: "human", trust: "owner", identity_verification: "verified" },
        "alex@agent": { role: "agent", trust: "owner" },
        "bill@counterparty.com": { role: "human", trust: "external" }
    },
    messages: [{
        from: "jim@acme.com",
        to: ["bill@counterparty.com", "alex@agent"],
        body: "Hey Alex, find a time for Bill and me to meet",
        timestamp: "2026-04-21T14:00:00Z"
    }]
});

// 3. In your tool handler, wrap execution through the context
const result = await context.execute("calendar", calendarTool.execute, params);
// result.status: "ok" | "permission_required" | "denied"
// result.data: transformed output (titles replaced with "Busy", etc.)
```

## How It Works

`context.execute` runs a 6-step pipeline:

1. **Tool registration check** — is the tool registered in the guard config?
2. **Identity verification** — does the participant's verification level permit this tool's access mode?
3. **Grant check** — valid grant exists? Only humans can grant. Agents are structurally excluded.
4. **Rule matching** — JSONata expressions match against tool call data. First match wins.
5. **Disclosure resolution** — which disclosure level for the lowest-trust participant present?
6. **Transformation** — JSONata transform reshapes the response. Default closed — fields not included don't exist.

## Access Modes

A single `access` field controls both whether a tool is gated and how grants work. No impossible combinations.

| Mode | Behavior |
|---|---|
| `"open"` | No grant needed. Always executes. |
| `"owner_only"` | Only the data owner's message can trigger execution. **(default)** |
| `"explicit"` | Requires affirmative confirmation from the data owner in conversation. |
| `"implicit"` | Inferred from the data owner's intent (e.g., "find a time" implies calendar). |

## Participants

Every participant must declare both `role` and `trust` — no defaults, no ambiguity.

```typescript
participants: {
    "jim@acme.com": { role: "human", trust: "owner" },
    "alex@agent": { role: "agent", trust: "owner" },
    "bill@counterparty.com": { role: "human", trust: "external" }
}
```

- **`role: "human" | "agent"`** — agents are structurally excluded from granting access
- **`trust: "owner" | "verified" | "guest" | "external"`** — determines disclosure level
- **`identity_verification?: "verified" | "assumed" | "unverified"`** — overrides context-level default

## Identity Verification

Confidence-based, mechanism-agnostic. Set at context level with per-participant overrides.

| Level | Allowed Access Modes |
|---|---|
| `"verified"` | all |
| `"assumed"` | `open`, `owner_only`, `explicit` |
| `"unverified"` | `open` only |

## Policy Rules

JSONata expressions for both matching and transformation:

```typescript
{
    name: "Google Calendar",
    match: 'tool = "calendar"',
    disclosure: {
        owner: "full",
        verified: "free_busy_only",
        external: "free_busy_only"
    },
    disclosure_levels: {
        free_busy_only: {
            transform: 'items.{ "start": start, "end": end, "title": "Busy" }'
        },
        full: { transform: "$$" }
    }
}
```

Object shorthand is also supported for match expressions:

```typescript
match: { tool: "execute_tool", "params.provider": "google_calendar" }
// compiles to: tool = "execute_tool" and params.provider = "google_calendar"
```

## Audit Logging

Every `execute` call produces an audit entry:

```typescript
const entries = context.getAuditLog();
// [{ tool: "calendar", access: "owner_only", disclosure_level: "free_busy_only", status: "ok", ... }]
```

## Built-in Rules

- `comunical.builtins.googleCalendar` — free/busy, metadata, summary, and full disclosure levels
- `comunical.builtins.gmail` — metadata-only, summary, full, and none disclosure levels

## License

MIT
