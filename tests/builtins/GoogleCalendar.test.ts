import { describe, it, expect } from "vitest";
import { googleCalendar } from "../../src/builtins/GoogleCalendar";
import { matchRule } from "../../src/engine/RuleMatcher";
import { transform } from "../../src/engine/Transformer";

const calendarApiResponse = {
    items: [
        {
            start: { dateTime: "2026-04-21T10:00:00Z" },
            end: { dateTime: "2026-04-21T11:00:00Z" },
            status: "confirmed",
            title: "Board Meeting",
            attendees: [{ email: "jim@acme.com" }, { email: "cfo@acme.com" }],
            description: "Quarterly board review with financials"
        },
        {
            start: { dateTime: "2026-04-21T14:00:00Z" },
            end: { dateTime: "2026-04-21T15:30:00Z" },
            status: "tentative",
            title: "1:1 with Legal",
            attendees: [{ email: "jim@acme.com" }],
            description: "Review pending contracts"
        }
    ]
};

describe("Google Calendar builtin", () => {
    it("matches tool = 'calendar'", async () => {
        const result = await matchRule({ tool: "calendar", params: {} }, [googleCalendar]);
        expect(result).toBe(googleCalendar);
    });

    it("matches composio-style execute_tool with google_calendar provider", async () => {
        const result = await matchRule({ tool: "execute_tool", params: { provider: "google_calendar" } }, [googleCalendar]);
        expect(result).toBe(googleCalendar);
    });

    it("does not match unrelated tools", async () => {
        const result = await matchRule({ tool: "email", params: {} }, [googleCalendar]);
        expect(result).toBeNull();
    });

    it("free_busy_only transform strips titles and details", async () => {
        const expr = googleCalendar.disclosure_levels!["free_busy_only"].transform;
        const result = await transform(expr, calendarApiResponse);
        const items = result as Array<Record<string, unknown>>;
        expect(items).toHaveLength(2);
        expect(items[0]).toEqual({
            start: { dateTime: "2026-04-21T10:00:00Z" },
            end: { dateTime: "2026-04-21T11:00:00Z" },
            status: "confirmed",
            title: "Busy"
        });
        expect(items[0]).not.toHaveProperty("description");
        expect(items[0]).not.toHaveProperty("attendees");
    });

    it("metadata_only transform includes attendee count but not names", async () => {
        const expr = googleCalendar.disclosure_levels!["metadata_only"].transform;
        const result = await transform(expr, calendarApiResponse);
        const items = result as Array<Record<string, unknown>>;
        expect(items[0]).toHaveProperty("attendee_count", 2);
        expect(items[0]).not.toHaveProperty("attendees");
        expect(items[0]).not.toHaveProperty("title");
    });

    it("summary_only transform returns aggregate counts", async () => {
        const expr = googleCalendar.disclosure_levels!["summary_only"].transform;
        const result = await transform(expr, calendarApiResponse);
        expect(result).toEqual({ total_events: 2, busy_hours: 2.5 });
    });

    it("full transform passes through everything", async () => {
        const expr = googleCalendar.disclosure_levels!["full"].transform;
        const result = await transform(expr, calendarApiResponse);
        expect(result).toEqual(calendarApiResponse);
    });

    it("has disclosure mappings for all trust tiers", () => {
        expect(googleCalendar.disclosure.owner).toBe("full");
        expect(googleCalendar.disclosure.verified).toBe("free_busy_only");
        expect(googleCalendar.disclosure.guest).toBe("free_busy_only");
        expect(googleCalendar.disclosure.external).toBe("free_busy_only");
    });
});
