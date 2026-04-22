import { describe, it, expect } from "vitest";
import { getLowestTrustTier } from "../../src/engine/DisclosureResolver";
import type { Participant } from "../../src/Types";

describe("getLowestTrustTier", () => {
    it("returns 'external' when an external participant is present", () => {
        const participants: Record<string, Participant> = {
            "jim@acme.com": { role: "human", trust: "owner" },
            "bill@counterparty.com": { role: "human", trust: "external" }
        };
        expect(getLowestTrustTier(participants)).toBe("external");
    });

    it("returns 'guest' when guest is lowest", () => {
        const participants: Record<string, Participant> = {
            "jim@acme.com": { role: "human", trust: "owner" },
            "intern@acme.com": { role: "human", trust: "guest" }
        };
        expect(getLowestTrustTier(participants)).toBe("guest");
    });

    it("returns 'verified' when no guest or external is present", () => {
        const participants: Record<string, Participant> = {
            "jim@acme.com": { role: "human", trust: "owner" },
            "legal@acme.com": { role: "human", trust: "verified" }
        };
        expect(getLowestTrustTier(participants)).toBe("verified");
    });

    it("returns 'owner' when all participants are owners", () => {
        const participants: Record<string, Participant> = {
            "jim@acme.com": { role: "human", trust: "owner" },
            "alex@agent": { role: "agent", trust: "owner" }
        };
        expect(getLowestTrustTier(participants)).toBe("owner");
    });
});
