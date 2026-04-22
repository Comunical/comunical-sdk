import { describe, it, expect } from "vitest";
import { resolveDisclosureLevel, getLowestTrustTier } from "../../src/engine/DisclosureResolver";
import type { PolicyRule, Participant } from "../../src/Types";

const calendarRule: PolicyRule = {
    name: "Google Calendar",
    match: 'tool = "calendar"',
    disclosure: {
        owner: "full",
        verified: "free_busy_only",
        guest: "free_busy_only",
        external: "free_busy_only"
    }
};

const crmRule: PolicyRule = {
    name: "CRM",
    match: 'tool = "crm"',
    disclosure: {
        owner: "full",
        verified: "metadata_only",
        guest: "none",
        external: "none"
    }
};

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

describe("resolveDisclosureLevel", () => {
    it("resolves to 'full' when only owners are present", () => {
        const participants: Record<string, Participant> = {
            "jim@acme.com": { role: "human", trust: "owner" },
            "alex@agent": { role: "agent", trust: "owner" }
        };
        expect(resolveDisclosureLevel(calendarRule, participants)).toBe("full");
    });

    it("resolves to 'free_busy_only' when an external participant is present", () => {
        const participants: Record<string, Participant> = {
            "jim@acme.com": { role: "human", trust: "owner" },
            "bill@counterparty.com": { role: "human", trust: "external" }
        };
        expect(resolveDisclosureLevel(calendarRule, participants)).toBe("free_busy_only");
    });

    it("resolves to 'none' for CRM when guest is present", () => {
        const participants: Record<string, Participant> = {
            "jim@acme.com": { role: "human", trust: "owner" },
            "intern@acme.com": { role: "human", trust: "guest" }
        };
        expect(resolveDisclosureLevel(crmRule, participants)).toBe("none");
    });

    it("resolves to 'metadata_only' for CRM when only verified is present", () => {
        const participants: Record<string, Participant> = {
            "jim@acme.com": { role: "human", trust: "owner" },
            "legal@acme.com": { role: "human", trust: "verified" }
        };
        expect(resolveDisclosureLevel(crmRule, participants)).toBe("metadata_only");
    });
});
