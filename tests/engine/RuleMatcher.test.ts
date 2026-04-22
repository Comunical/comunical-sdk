import { describe, it, expect } from "vitest";
import { matchRule } from "../../src/engine/RuleMatcher";
import type { PolicyRule } from "../../src/Types";

const calendarRule: PolicyRule = {
    name: "Google Calendar",
    match: 'tool = "calendar"',
    disclosure: { owner: "full", verified: "free_busy_only", guest: "free_busy_only", external: "free_busy_only" },
    disclosure_levels: {
        free_busy_only: { transform: 'items.{ "start": start, "end": end, "title": "Busy" }' },
        full: { transform: "$$" }
    }
};

const composioCalendarRule: PolicyRule = {
    name: "Composio Calendar",
    match: 'tool = "execute_tool" and params.provider = "google_calendar"',
    disclosure: { owner: "full", verified: "free_busy_only", guest: "free_busy_only", external: "free_busy_only" }
};

const emailRule: PolicyRule = {
    name: "Gmail",
    match: { tool: "email" },
    disclosure: { owner: "full", verified: "metadata_only", guest: "metadata_only", external: "none" }
};

const crmRule: PolicyRule = {
    name: "CRM",
    match: { tool: "execute_tool", "params.provider": "salesforce" },
    disclosure: { owner: "full", verified: "metadata_only", guest: "none", external: "none" }
};

const rules = [calendarRule, composioCalendarRule, emailRule, crmRule];

describe("RuleMatcher", () => {
    it("matches a simple string expression against tool name", async () => {
        const result = await matchRule({ tool: "calendar", params: {} }, rules);
        expect(result).toBe(calendarRule);
    });

    it("matches a compound string expression with params", async () => {
        const result = await matchRule({ tool: "execute_tool", params: { provider: "google_calendar" } }, rules);
        expect(result).toBe(composioCalendarRule);
    });

    it("matches an object sugar expression (single key)", async () => {
        const result = await matchRule({ tool: "email", params: {} }, rules);
        expect(result).toBe(emailRule);
    });

    it("matches an object sugar expression (multiple keys)", async () => {
        const result = await matchRule({ tool: "execute_tool", params: { provider: "salesforce" } }, rules);
        expect(result).toBe(crmRule);
    });

    it("returns null when no rule matches", async () => {
        const result = await matchRule({ tool: "unknown_tool", params: {} }, rules);
        expect(result).toBeNull();
    });

    it("returns the first matching rule when multiple could match", async () => {
        const broadRule: PolicyRule = {
            name: "Catch-all",
            match: 'tool = "calendar"',
            disclosure: { owner: "full", verified: "full", guest: "full", external: "full" }
        };
        const result = await matchRule({ tool: "calendar", params: {} }, [calendarRule, broadRule]);
        expect(result).toBe(calendarRule);
    });

    it("does not match when params don't satisfy the expression", async () => {
        const result = await matchRule({ tool: "execute_tool", params: { provider: "outlook" } }, rules);
        expect(result).toBeNull();
    });

    it("handles $contains pattern matching", async () => {
        const patternRule: PolicyRule = {
            name: "Google Tools",
            match: 'tool = "execute_tool" and $contains(params.provider, "google")',
            disclosure: { owner: "full", verified: "full", guest: "full", external: "full" }
        };
        const result = await matchRule({ tool: "execute_tool", params: { provider: "google_calendar" } }, [patternRule]);
        expect(result).toBe(patternRule);
    });

    it("handles 'in' array matching", async () => {
        const arrayRule: PolicyRule = {
            name: "Google Suite",
            match: 'tool = "execute_tool" and params.provider in ["google_calendar", "gmail"]',
            disclosure: { owner: "full", verified: "full", guest: "full", external: "full" }
        };
        const result = await matchRule({ tool: "execute_tool", params: { provider: "gmail" } }, [arrayRule]);
        expect(result).toBe(arrayRule);
    });
});
