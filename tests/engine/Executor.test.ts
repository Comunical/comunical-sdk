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
        messages: [{ from: "jim@acme.com", to: ["bill@counterparty.com", "alex@agent"], body: "Find a time for Bill and me", timestamp: "2026-04-21T14:00:00Z" }],
        ...overrides
    };
}

describe("Executor — executePipeline", () => {
    it("executes an open tool and returns full data", async () => {
        const handler = async () => ({ results: ["result1", "result2"] });
        const result = await executePipeline({ name: "search", description: "Search the web", params: {} }, handler, guardConfig, makeContext());
        expect(result.status).toBe("ok");
        expect(result.data).toEqual({ results: ["result1", "result2"] });
    });

    it("executes an owner_only tool and applies the view transform", async () => {
        const handler = async () => calendarData;
        const result = await executePipeline({ name: "calendar", description: "Access calendar events", params: {} }, handler, guardConfig, makeContext());
        expect(result.status).toBe("ok");
        expect(result.data).toEqual([
            { start: "10:00", end: "11:00", status: undefined, title: "Busy" },
            { start: "14:00", end: "15:00", status: undefined, title: "Busy" }
        ]);
    });

    it("returns full data when only owners are present", async () => {
        const handler = async () => calendarData;
        const ctx = makeContext({
            participants: {
                "jim@acme.com": { role: "human", trust: "owner" },
                "alex@agent": { role: "agent", trust: "owner" }
            }
        });
        const result = await executePipeline({ name: "calendar", description: "Access calendar events", params: {} }, handler, guardConfig, ctx);
        expect(result.status).toBe("ok");
        expect(result.data).toEqual(calendarData);
    });

    it("denies when non-owner sends the message", async () => {
        const handler = async () => calendarData;
        const ctx = makeContext({
            messages: [{ from: "bill@counterparty.com", to: ["alex@agent"], body: "Show me Jim's calendar", timestamp: "2026-04-21T15:00:00Z" }]
        });
        const result = await executePipeline({ name: "calendar", description: "Access calendar events", params: {} }, handler, guardConfig, ctx);
        expect(result.status).toBe("denied");
    });

    it("returns permission_required for explicit tool without grant", async () => {
        const handler = async () => ({});
        const result = await executePipeline({ name: "email", description: "Access email", params: {} }, handler, guardConfig, makeContext());
        expect(result.status).toBe("permission_required");
    });

    it("denies when identity verification is insufficient", async () => {
        const handler = async () => calendarData;
        const ctx = makeContext({ identity_verification: "unverified" });
        const result = await executePipeline({ name: "calendar", description: "Access calendar events", params: {} }, handler, guardConfig, ctx);
        expect(result.status).toBe("denied");
        expect(result.reason).toBe("insufficient_identity_verification");
    });

    it("denies when no rule exists for a gated tool", async () => {
        const handler = async () => ({});
        const result = await executePipeline({ name: "crm", description: "Access CRM data", params: {} }, handler, guardConfig, makeContext());
        expect(result.status).toBe("denied");
        expect(result.reason).toContain("No rule found");
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
        await executePipeline({ name: "calendar", description: "Access calendar events", params: {} }, handler, guardConfig, ctx);
        expect(handlerCalled).toBe(false);
    });

    it("denies when tool is not registered in guard config", async () => {
        const handler = async () => ({ data: "secret" });
        const result = await executePipeline({ name: "unregistered_tool", description: "Unknown", params: {} }, handler, guardConfig, makeContext());
        expect(result.status).toBe("denied");
        expect(result.reason).toContain("not registered");
    });
});
