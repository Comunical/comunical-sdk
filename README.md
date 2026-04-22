# @comunical/sdk

Middleware for AI agent tool execution — context-aware trust boundaries in multi-party interactions.

## What It Does

When an AI agent operates in a group context — a shared channel, a multi-party thread, a collaborative workspace — it sits between humans with different trust levels and permissions. Comunical enforces trust boundaries *structurally*, not *behaviorally*. If information shouldn't be available, it never enters the context window.

## Quick Start

```typescript
import { comunical } from "@comunical/sdk";

const guard = comunical.createGuard({
    tools: {
        search: { access: "open" },
        calendar: {},                              // owner_only by default
        email: { access: "explicit" }
    },
    policies: {
        rules: [comunical.builtins.googleCalendar, comunical.builtins.gmail]
    }
});

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

// In your tool handler:
const result = await context.execute("calendar", calendarTool.execute, params);
```

## How It Works

1. **Identity verification check** — does the participant's verification level permit this tool's access mode?
2. **Grant check** — valid grant exists? Only humans can grant. Agents are structurally excluded.
3. **Rule matching** — JSONata expressions match against tool call data. First match wins.
4. **Disclosure resolution** — which level for the lowest-trust participant present?
5. **Execution** — call the developer's tool handler.
6. **Transformation** — JSONata transform reshapes the response. Default closed — fields not included don't exist.

## Access Modes

| Mode | Behavior |
|---|---|
| `"open"` | No grant needed. Always executes. |
| `"owner_only"` | Only the data owner's message can trigger execution. **(default)** |
| `"explicit"` | Requires affirmative confirmation from the data owner. |
| `"implicit"` | Inferred from the data owner's intent. Convenience layer — transformation still protects data. |

## License

MIT
