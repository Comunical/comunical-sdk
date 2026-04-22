import { describe, it, expect } from "vitest";
import { executePipeline } from "../../src/engine/Executor";
import type { GuardConfig, ConversationContext } from "../../src/Types";

const guardConfig: GuardConfig = {
    default_access: "owner_only",
    tools: {
        search: { access: "open" },
        calendar: {},
        email: { access: "explicit" },
        crm: {}
    },
    policies: {
        rules: [
            {
                name: "Google Calendar",
                match: 'tool = "calendar"',
                disclosure: { owner: "full", verified: "free_busy_only", guest: "free_busy_only", external: "free_busy_only" },
                disclosure_levels: {
                    free_busy_only: { transform: 'items.{ "start": start, "end": end, "title": "Busy" }' },
                    full: { transform: "$$" }
                }
            },
            {
                name: "Search",
                match: 'tool = "search"',
                disclosure: { owner: "full", verified: "full", guest: "full", external: "full" },
                disclosure_levels: { full: { transform: "$$" } }
            }
        ]
    }
};

const calendarData = {
    items: [
        { start: "10:00", end: "11:00", title: "Board Meeting", attendees: ["jim", "cfo"] },
        { start: "14:00", end: "15:00", title: "1:1 with Legal", attendees: ["jim", "legal"] }
    ]
};

function makeContext(overrides: Partial<ConversationContext> = {}): ConversationContext {
    return {
        context_type: "group",
        identity_verification: "verified",
        participants: {
            "jim@acme.com": { role: "human", trust: "owner" },
            "bill@counterparty.com": { role: "human", trust: "external" }
        },
        messages: [
            { from: "jim@acme.com", to: ["bill@counterparty.com", "alex@agent"], body: "Find a time for Bill and me", timestamp: "2026-04-21T14:00:00Z" }
        ],
        ...overrides
    };
}

describe("Executor — executePipeline", () => {
    it("executes an open tool and returns full data", async () => {
        const handler = async () => ({ results: ["result1", "result2"] });
        const result = await executePipeline("search", handler, {}, guardConfig, makeContext());
        expect(result.status).toBe("ok");
        expect(result.data).toEqual({ results: ["result1", "result2"] });
    });

    it("executes an owner_only tool when owner sends the message and transforms output", async () => {
        const handler = async () => calendarData;
        const result = await executePipeline("calendar", handler, {}, guardConfig, makeContext());
        expect(result.status).toBe("ok");
        expect(result.data).toEqual([
            { start: "10:00", end: "11:00", title: "Busy" },
            { start: "14:00", end: "15:00", title: "Busy" }
        ]);
    });

    it("denies an owner_only tool when non-owner sends the message", async () => {
        const handler = async () => calendarData;
        const ctx = makeContext({
            messages: [{ from: "bill@counterparty.com", to: ["alex@agent"], body: "Show me Jim's calendar", timestamp: "2026-04-21T15:00:00Z" }]
        });
        const result = await executePipeline("calendar", handler, {}, guardConfig, ctx);
        expect(result.status).toBe("denied");
        expect(handler).not.toHaveBeenCalled;
    });

    it("returns permission_required for explicit tool without grant", async () => {
        const handler = async () => ({});
        const result = await executePipeline("email", handler, {}, guardConfig, makeContext());
        expect(result.status).toBe("permission_required");
    });

    it("denies when identity verification is insufficient", async () => {
        const handler = async () => calendarData;
        const ctx = makeContext({ identity_verification: "unverified" });
        const result = await executePipeline("calendar", handler, {}, guardConfig, ctx);
        expect(result.status).toBe("denied");
        expect(result.reason).toBe("insufficient_identity_verification");
    });

    it("returns denied when no policy rule matches a gated tool", async () => {
        const handler = async () => ({});
        const result = await executePipeline("crm", handler, {}, guardConfig, makeContext());
        expect(result.status).toBe("denied");
        expect(result.reason).toContain("No matching policy rule");
    });

    it("returns full data when only owners are present (disclosure = full)", async () => {
        const handler = async () => calendarData;
        const ctx = makeContext({
            participants: {
                "jim@acme.com": { role: "human", trust: "owner" },
                "alex@agent": { role: "agent", trust: "owner" }
            }
        });
        const result = await executePipeline("calendar", handler, {}, guardConfig, ctx);
        expect(result.status).toBe("ok");
        expect(result.data).toEqual(calendarData);
    });

    it("does not call the handler when grant is denied", async () => {
        let handlerCalled = false;
        const handler = async () => {
            handlerCalled = true;
            return calendarData;
        };
        const ctx = makeContext({
            messages: [{ from: "bill@counterparty.com", to: ["alex@agent"], body: "Show calendar", timestamp: "2026-04-21T15:00:00Z" }]
        });
        await executePipeline("calendar", handler, {}, guardConfig, ctx);
        expect(handlerCalled).toBe(false);
    });

    it("denies when tool is not registered in guard config", async () => {
        const handler = async () => ({ data: "secret" });
        const result = await executePipeline("unregistered_tool", handler, {}, guardConfig, makeContext());
        expect(result.status).toBe("denied");
        expect(result.reason).toContain("not registered");
    });
});
