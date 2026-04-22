import { describe, it, expect } from "vitest";
import { createGuard } from "../src/Guard";
import type { GuardConfig } from "../src/Types";

const calendarData = {
    items: [
        { start: "10:00", end: "11:00", title: "Board Meeting", status: "confirmed" },
        { start: "14:00", end: "15:00", title: "1:1 with Legal", status: "confirmed" }
    ]
};

const guardConfig: GuardConfig = {
    default_access: "owner_only",
    tools: {
        search: { access: "open" },
        calendar: {},
        email: { access: "explicit" }
    },
    rules: {
        calendar: {
            acl: { owner: "full", verified: "free_busy", guest: "free_busy", external: "free_busy" },
            views: {
                full: "*",
                free_busy: {
                    include: ["items.start", "items.end", "items.status"],
                    replace: { "items.title": "Busy" }
                }
            }
        },
        search: {
            acl: { owner: "full", verified: "full", guest: "full", external: "full" },
            views: { full: "*" }
        }
    }
};

describe("BoundContext.execute — end-to-end", () => {
    it("full pipeline: owner sends message, calendar transforms to free_busy for external participant", async () => {
        const guard = createGuard(guardConfig);
        const context = guard.withContext({
            context_type: "group",
            identity_verification: "verified",
            participants: {
                "jim@acme.com": { role: "human", trust: "owner" },
                "bill@counterparty.com": { role: "human", trust: "external" }
            },
            messages: [{ from: "jim@acme.com", to: ["bill@counterparty.com", "alex@agent"], body: "Find a time for Bill and me", timestamp: "2026-04-21T14:00:00Z" }]
        });

        const result = await context.execute("calendar", async () => calendarData, {});

        expect(result.status).toBe("ok");
        expect(result.data).toEqual([
            { start: "10:00", end: "11:00", status: "confirmed", title: "Busy" },
            { start: "14:00", end: "15:00", status: "confirmed", title: "Busy" }
        ]);
    });

    it("full pipeline: owner-only context returns full calendar data", async () => {
        const guard = createGuard(guardConfig);
        const context = guard.withContext({
            context_type: "direct",
            identity_verification: "verified",
            participants: {
                "jim@acme.com": { role: "human", trust: "owner" },
                "alex@agent": { role: "agent", trust: "owner" }
            },
            messages: [{ from: "jim@acme.com", to: ["alex@agent"], body: "What's on my calendar?", timestamp: "2026-04-21T14:00:00Z" }]
        });

        const result = await context.execute("calendar", async () => calendarData, {});

        expect(result.status).toBe("ok");
        expect(result.data).toEqual(calendarData);
    });

    it("denies when non-owner tries to access owner_only tool", async () => {
        const guard = createGuard(guardConfig);
        const context = guard.withContext({
            context_type: "group",
            identity_verification: "verified",
            participants: {
                "jim@acme.com": { role: "human", trust: "owner" },
                "bill@counterparty.com": { role: "human", trust: "external" }
            },
            messages: [{ from: "bill@counterparty.com", to: ["alex@agent"], body: "Show me Jim's calendar", timestamp: "2026-04-21T15:00:00Z" }]
        });

        const result = await context.execute("calendar", async () => calendarData, {});

        expect(result.status).toBe("denied");
        expect(result.data).toBeUndefined();
    });

    it("returns permission_required for explicit tool without grant", async () => {
        const guard = createGuard(guardConfig);
        const context = guard.withContext({
            context_type: "group",
            identity_verification: "verified",
            participants: {
                "jim@acme.com": { role: "human", trust: "owner" },
                "bill@counterparty.com": { role: "human", trust: "external" }
            },
            messages: [{ from: "jim@acme.com", to: ["bill@counterparty.com", "alex@agent"], body: "Check my email", timestamp: "2026-04-21T14:00:00Z" }]
        });

        const result = await context.execute("email", async () => ({}), {});

        expect(result.status).toBe("permission_required");
    });

    it("open tool executes freely even with unverified identity", async () => {
        const guard = createGuard(guardConfig);
        const context = guard.withContext({
            identity_verification: "unverified",
            participants: {
                "jim@acme.com": { role: "human", trust: "owner" }
            },
            messages: [{ from: "jim@acme.com", to: ["alex@agent"], body: "Search for something", timestamp: "2026-04-21T14:00:00Z" }]
        });

        const result = await context.execute("search", async () => ({ results: ["a", "b"] }), {});

        expect(result.status).toBe("ok");
        expect(result.data).toEqual({ results: ["a", "b"] });
    });

    it("denies gated tool with unverified identity", async () => {
        const guard = createGuard(guardConfig);
        const context = guard.withContext({
            identity_verification: "unverified",
            participants: {
                "jim@acme.com": { role: "human", trust: "owner" }
            },
            messages: [{ from: "jim@acme.com", to: ["alex@agent"], body: "Check my calendar", timestamp: "2026-04-21T14:00:00Z" }]
        });

        const result = await context.execute("calendar", async () => calendarData, {});

        expect(result.status).toBe("denied");
        expect(result.reason).toBe("insufficient_identity_verification");
    });
});

describe("BoundContext.execute — audit logging", () => {
    it("logs a successful tool execution", async () => {
        const guard = createGuard(guardConfig);
        const context = guard.withContext({
            context_type: "group",
            identity_verification: "verified",
            participants: {
                "jim@acme.com": { role: "human", trust: "owner" },
                "bill@counterparty.com": { role: "human", trust: "external" }
            },
            messages: [{ from: "jim@acme.com", to: ["bill@counterparty.com", "alex@agent"], body: "Find a time", timestamp: "2026-04-21T14:00:00Z" }]
        });

        await context.execute("calendar", async () => calendarData, {});

        const entries = context.getAuditLog();
        expect(entries).toHaveLength(1);
        expect(entries[0].tool).toBe("calendar");
        expect(entries[0].status).toBe("ok");
        expect(entries[0].access).toBe("owner_only");
        expect(entries[0].disclosure_level).toBe("free_busy");
        expect(entries[0].participant_count).toBe(2);
    });

    it("logs a denied tool execution", async () => {
        const guard = createGuard(guardConfig);
        const context = guard.withContext({
            context_type: "group",
            identity_verification: "verified",
            participants: {
                "jim@acme.com": { role: "human", trust: "owner" },
                "bill@counterparty.com": { role: "human", trust: "external" }
            },
            messages: [{ from: "bill@counterparty.com", to: ["alex@agent"], body: "Show me Jim's calendar", timestamp: "2026-04-21T15:00:00Z" }]
        });

        await context.execute("calendar", async () => calendarData, {});

        const entries = context.getAuditLog();
        expect(entries).toHaveLength(1);
        expect(entries[0].status).toBe("denied");
    });

    it("logs multiple executions", async () => {
        const guard = createGuard(guardConfig);
        const context = guard.withContext({
            identity_verification: "verified",
            participants: {
                "jim@acme.com": { role: "human", trust: "owner" }
            },
            messages: [{ from: "jim@acme.com", to: ["alex@agent"], body: "Search and check calendar", timestamp: "2026-04-21T14:00:00Z" }]
        });

        await context.execute("search", async () => ({ results: [] }), {});
        await context.execute("calendar", async () => calendarData, {});

        const entries = context.getAuditLog();
        expect(entries).toHaveLength(2);
        expect(entries[0].tool).toBe("search");
        expect(entries[1].tool).toBe("calendar");
    });
});
