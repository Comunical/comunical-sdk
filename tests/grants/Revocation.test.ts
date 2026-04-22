import { describe, it, expect } from "vitest";
import { isGrantorPresent } from "../../src/grants/Revocation";
import type { MessageEnvelope } from "../../src/Types";

describe("Revocation", () => {
    it("returns true when grantor is in the 'from' field", () => {
        const message: MessageEnvelope = {
            from: "jim@acme.com",
            to: ["alex@agent"],
            body: "Check my calendar",
            timestamp: "2026-04-21T14:00:00Z"
        };
        expect(isGrantorPresent("jim@acme.com", message)).toBe(true);
    });

    it("returns true when grantor is in the 'to' field", () => {
        const message: MessageEnvelope = {
            from: "bill@counterparty.com",
            to: ["jim@acme.com", "alex@agent"],
            body: "Let's schedule a meeting",
            timestamp: "2026-04-21T14:00:00Z"
        };
        expect(isGrantorPresent("jim@acme.com", message)).toBe(true);
    });

    it("returns true when grantor is in the 'cc' field", () => {
        const message: MessageEnvelope = {
            from: "bill@counterparty.com",
            to: ["alex@agent"],
            cc: ["jim@acme.com"],
            body: "Can we meet?",
            timestamp: "2026-04-21T14:00:00Z"
        };
        expect(isGrantorPresent("jim@acme.com", message)).toBe(true);
    });

    it("returns false when grantor is not on the message at all", () => {
        const message: MessageEnvelope = {
            from: "bill@counterparty.com",
            to: ["alex@agent"],
            body: "Show me Jim's schedule",
            timestamp: "2026-04-21T15:00:00Z"
        };
        expect(isGrantorPresent("jim@acme.com", message)).toBe(false);
    });

    it("returns false when cc is undefined and grantor is not in from/to", () => {
        const message: MessageEnvelope = {
            from: "bill@counterparty.com",
            to: ["alex@agent"],
            body: "What's on Jim's calendar?",
            timestamp: "2026-04-21T15:00:00Z"
        };
        expect(isGrantorPresent("jim@acme.com", message)).toBe(false);
    });
});
