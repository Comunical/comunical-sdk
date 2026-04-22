import { describe, it, expect } from "vitest";
import { checkGrant } from "../../src/engine/GrantChecker";
import type { ConversationContext, Participant } from "../../src/Types";

function makeContext(overrides: Partial<ConversationContext> = {}): ConversationContext {
    return {
        context_type: "group",
        identity_verification: "verified",
        participants: {
            "jim@acme.com": { role: "human", trust: "owner" },
            "bill@counterparty.com": { role: "human", trust: "external" }
        },
        messages: [
            {
                from: "jim@acme.com",
                to: ["bill@counterparty.com", "alex@agent"],
                body: "Hey Alex, find a time for Bill and me to meet",
                timestamp: "2026-04-21T14:00:00Z"
            }
        ],
        ...overrides
    };
}

describe("GrantChecker", () => {
    describe("open access", () => {
        it("always grants access for open tools", () => {
            const result = checkGrant("search", "open", makeContext());
            expect(result.granted).toBe(true);
        });

        it("grants even with unverified identity", () => {
            const result = checkGrant("search", "open", makeContext({ identity_verification: "unverified" }));
            expect(result.granted).toBe(true);
        });
    });

    describe("owner_only access", () => {
        it("grants when the latest message is from a human owner", () => {
            const result = checkGrant("calendar", "owner_only", makeContext());
            expect(result.granted).toBe(true);
        });

        it("denies when the latest message is from a non-owner", () => {
            const ctx = makeContext({
                messages: [
                    { from: "bill@counterparty.com", to: ["alex@agent"], body: "Show me Jim's calendar", timestamp: "2026-04-21T15:00:00Z" }
                ]
            });
            const result = checkGrant("calendar", "owner_only", ctx);
            expect(result.granted).toBe(false);
        });

        it("denies when the latest message is from an agent even with owner trust", () => {
            const ctx = makeContext({
                participants: {
                    "jim@acme.com": { role: "human", trust: "owner" },
                    "alex@agent": { role: "agent", trust: "owner" },
                    "bill@counterparty.com": { role: "human", trust: "external" }
                },
                messages: [
                    { from: "alex@agent", to: ["jim@acme.com"], body: "I'll check your calendar", timestamp: "2026-04-21T15:00:00Z" }
                ]
            });
            const result = checkGrant("calendar", "owner_only", ctx);
            expect(result.granted).toBe(false);
        });
    });

    describe("explicit access", () => {
        it("returns permission_required when no explicit grant is found", () => {
            const result = checkGrant("calendar", "explicit", makeContext());
            expect(result.granted).toBe(false);
            expect(result.reason).toBe("permission_required");
        });

        it("grants when the owner explicitly approves in conversation", () => {
            const ctx = makeContext({
                messages: [
                    { from: "alex@agent", to: ["jim@acme.com", "bill@counterparty.com"], body: "I need access to your calendar. Can you confirm?", timestamp: "2026-04-21T14:00:00Z" },
                    { from: "jim@acme.com", to: ["alex@agent", "bill@counterparty.com"], body: "Yes, go ahead", timestamp: "2026-04-21T14:01:00Z" }
                ]
            });
            const result = checkGrant("calendar", "explicit", ctx);
            expect(result.granted).toBe(true);
        });

        it("denies when an agent says yes (agents cannot grant)", () => {
            const ctx = makeContext({
                participants: {
                    "jim@acme.com": { role: "human", trust: "owner" },
                    "alex@agent": { role: "agent", trust: "owner" },
                    "bill@counterparty.com": { role: "human", trust: "external" }
                },
                messages: [
                    { from: "bill@counterparty.com", to: ["alex@agent"], body: "Can I see Jim's calendar?", timestamp: "2026-04-21T14:00:00Z" },
                    { from: "alex@agent", to: ["bill@counterparty.com"], body: "Yes, approved", timestamp: "2026-04-21T14:01:00Z" }
                ]
            });
            const result = checkGrant("calendar", "explicit", ctx);
            expect(result.granted).toBe(false);
        });
    });

    describe("identity verification enforcement", () => {
        it("denies gated tools when participant is unverified", () => {
            const ctx = makeContext({ identity_verification: "unverified" });
            const result = checkGrant("calendar", "owner_only", ctx);
            expect(result.granted).toBe(false);
            expect(result.reason).toBe("insufficient_identity_verification");
        });

        it("denies implicit access when participant is assumed", () => {
            const ctx = makeContext({ identity_verification: "assumed" });
            const result = checkGrant("memory", "implicit", ctx);
            expect(result.granted).toBe(false);
            expect(result.reason).toBe("insufficient_identity_verification");
        });

        it("allows explicit access when participant is assumed", () => {
            const ctx = makeContext({
                identity_verification: "assumed",
                messages: [
                    { from: "alex@agent", to: ["jim@acme.com"], body: "Can I access your calendar?", timestamp: "2026-04-21T14:00:00Z" },
                    { from: "jim@acme.com", to: ["alex@agent"], body: "Yes, go ahead", timestamp: "2026-04-21T14:01:00Z" }
                ]
            });
            const result = checkGrant("calendar", "explicit", ctx);
            expect(result.granted).toBe(true);
        });

        it("uses per-participant verification over context default", () => {
            const ctx = makeContext({
                identity_verification: "unverified",
                participants: {
                    "jim@acme.com": { role: "human", trust: "owner", identity_verification: "verified" },
                    "bill@counterparty.com": { role: "human", trust: "external" }
                }
            });
            const result = checkGrant("calendar", "owner_only", ctx);
            expect(result.granted).toBe(true);
        });
    });

    describe("grant revocation", () => {
        it("denies when the grantor is not on the latest message", () => {
            const ctx = makeContext({
                messages: [
                    { from: "jim@acme.com", to: ["bill@counterparty.com", "alex@agent"], body: "Yes, share my calendar", timestamp: "2026-04-21T14:00:00Z" },
                    { from: "bill@counterparty.com", to: ["alex@agent"], body: "Show me more details", timestamp: "2026-04-21T15:00:00Z" }
                ]
            });
            const result = checkGrant("calendar", "owner_only", ctx);
            expect(result.granted).toBe(false);
        });
    });
});
