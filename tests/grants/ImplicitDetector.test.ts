import { describe, it, expect } from "vitest";
import { detectImplicitGrant } from "../../src/grants/ImplicitDetector";
import type { MessageEnvelope, Participant } from "../../src/Types";

const participants: Record<string, Participant> = {
    "jim@acme.com": { role: "human", trust: "owner" },
    "alex@agent": { role: "agent", trust: "owner" },
    "bill@counterparty.com": { role: "human", trust: "external" }
};

describe("ImplicitDetector", () => {
    describe("detects intent from owner messages", () => {
        it("detects scheduling intent as calendar grant", () => {
            const messages: MessageEnvelope[] = [
                { from: "jim@acme.com", to: ["alex@agent", "bill@counterparty.com"], body: "Find a time for Bill and me to meet", timestamp: "2026-04-21T14:00:00Z" }
            ];
            expect(detectImplicitGrant(messages, "calendar", participants)).toBe(true);
        });

        it("detects 'check my calendar' as calendar grant", () => {
            const messages: MessageEnvelope[] = [{ from: "jim@acme.com", to: ["alex@agent"], body: "Check my calendar for availability", timestamp: "2026-04-21T14:00:00Z" }];
            expect(detectImplicitGrant(messages, "calendar", participants)).toBe(true);
        });

        it("detects 'send an email' as email grant", () => {
            const messages: MessageEnvelope[] = [
                { from: "jim@acme.com", to: ["alex@agent"], body: "Send an email to the team about the meeting", timestamp: "2026-04-21T14:00:00Z" }
            ];
            expect(detectImplicitGrant(messages, "email", participants)).toBe(true);
        });

        it("detects 'check my inbox' as email grant", () => {
            const messages: MessageEnvelope[] = [{ from: "jim@acme.com", to: ["alex@agent"], body: "Check my inbox for anything from legal", timestamp: "2026-04-21T14:00:00Z" }];
            expect(detectImplicitGrant(messages, "email", participants)).toBe(true);
        });
    });

    describe("does not false-positive", () => {
        it("does not detect calendar intent for unrelated messages", () => {
            const messages: MessageEnvelope[] = [{ from: "jim@acme.com", to: ["alex@agent"], body: "What's the weather like today?", timestamp: "2026-04-21T14:00:00Z" }];
            expect(detectImplicitGrant(messages, "calendar", participants)).toBe(false);
        });

        it("does not detect email intent for unrelated messages", () => {
            const messages: MessageEnvelope[] = [{ from: "jim@acme.com", to: ["alex@agent"], body: "Search for restaurants nearby", timestamp: "2026-04-21T14:00:00Z" }];
            expect(detectImplicitGrant(messages, "email", participants)).toBe(false);
        });
    });

    describe("agent and non-owner exclusion", () => {
        it("does not detect intent from agent messages", () => {
            const messages: MessageEnvelope[] = [{ from: "alex@agent", to: ["jim@acme.com"], body: "I'll schedule a meeting for you", timestamp: "2026-04-21T14:00:00Z" }];
            expect(detectImplicitGrant(messages, "calendar", participants)).toBe(false);
        });

        it("does not detect intent from non-owner humans", () => {
            const messages: MessageEnvelope[] = [{ from: "bill@counterparty.com", to: ["alex@agent"], body: "Schedule a meeting with Jim", timestamp: "2026-04-21T14:00:00Z" }];
            expect(detectImplicitGrant(messages, "calendar", participants)).toBe(false);
        });
    });

    describe("tool name matching", () => {
        it("returns false for unknown tool names with no patterns", () => {
            const messages: MessageEnvelope[] = [{ from: "jim@acme.com", to: ["alex@agent"], body: "Find a time for Bill and me to meet", timestamp: "2026-04-21T14:00:00Z" }];
            expect(detectImplicitGrant(messages, "crm", participants)).toBe(false);
        });

        it("uses the latest owner message for detection", () => {
            const messages: MessageEnvelope[] = [
                { from: "jim@acme.com", to: ["alex@agent"], body: "Find a time to meet", timestamp: "2026-04-21T14:00:00Z" },
                { from: "bill@counterparty.com", to: ["alex@agent"], body: "What's the weather?", timestamp: "2026-04-21T14:01:00Z" },
                { from: "jim@acme.com", to: ["alex@agent"], body: "Never mind, just search for it", timestamp: "2026-04-21T14:02:00Z" }
            ];
            expect(detectImplicitGrant(messages, "calendar", participants)).toBe(false);
        });
    });
});
