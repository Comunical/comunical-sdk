import { describe, it, expect } from "vitest";
import { detectExplicitGrant } from "../../src/grants/ExplicitDetector";
import type { MessageEnvelope, Participant } from "../../src/Types";

const participants: Record<string, Participant> = {
    "jim@acme.com": { role: "human", trust: "owner" },
    "alex@agent": { role: "agent", trust: "owner" },
    "bill@counterparty.com": { role: "human", trust: "external" }
};

describe("ExplicitDetector", () => {
    it("detects 'yes' as an affirmative grant from a human owner", () => {
        const messages: MessageEnvelope[] = [
            { from: "alex@agent", to: ["jim@acme.com"], body: "Can I access your calendar?", timestamp: "2026-04-21T14:00:00Z" },
            { from: "jim@acme.com", to: ["alex@agent"], body: "Yes", timestamp: "2026-04-21T14:01:00Z" }
        ];
        expect(detectExplicitGrant(messages, "calendar", participants)).toBe(true);
    });

    it("detects 'go ahead' as an affirmative grant", () => {
        const messages: MessageEnvelope[] = [
            { from: "alex@agent", to: ["jim@acme.com"], body: "I need to check your email. Is that okay?", timestamp: "2026-04-21T14:00:00Z" },
            { from: "jim@acme.com", to: ["alex@agent"], body: "Go ahead", timestamp: "2026-04-21T14:01:00Z" }
        ];
        expect(detectExplicitGrant(messages, "email", participants)).toBe(true);
    });

    it("detects 'sure' as an affirmative grant", () => {
        const messages: MessageEnvelope[] = [
            { from: "jim@acme.com", to: ["alex@agent"], body: "Sure, that's fine", timestamp: "2026-04-21T14:01:00Z" }
        ];
        expect(detectExplicitGrant(messages, "calendar", participants)).toBe(true);
    });

    it("detects 'approved' as an affirmative grant", () => {
        const messages: MessageEnvelope[] = [
            { from: "jim@acme.com", to: ["alex@agent"], body: "Approved", timestamp: "2026-04-21T14:01:00Z" }
        ];
        expect(detectExplicitGrant(messages, "calendar", participants)).toBe(true);
    });

    it("does not detect a grant from a non-owner human", () => {
        const messages: MessageEnvelope[] = [
            { from: "bill@counterparty.com", to: ["alex@agent"], body: "Yes, go ahead", timestamp: "2026-04-21T14:01:00Z" }
        ];
        expect(detectExplicitGrant(messages, "calendar", participants)).toBe(false);
    });

    it("does not detect a grant from an agent", () => {
        const messages: MessageEnvelope[] = [
            { from: "alex@agent", to: ["jim@acme.com"], body: "Yes, approved", timestamp: "2026-04-21T14:01:00Z" }
        ];
        expect(detectExplicitGrant(messages, "calendar", participants)).toBe(false);
    });

    it("does not detect a grant from unrelated conversation", () => {
        const messages: MessageEnvelope[] = [
            { from: "jim@acme.com", to: ["alex@agent"], body: "No, don't do that", timestamp: "2026-04-21T14:01:00Z" }
        ];
        expect(detectExplicitGrant(messages, "calendar", participants)).toBe(false);
    });

    it("detects grant case-insensitively", () => {
        const messages: MessageEnvelope[] = [
            { from: "jim@acme.com", to: ["alex@agent"], body: "YES PLEASE", timestamp: "2026-04-21T14:01:00Z" }
        ];
        expect(detectExplicitGrant(messages, "calendar", participants)).toBe(true);
    });
});
