import { describe, it, expect } from "vitest";
import { googleCalendar } from "../../src/builtins/GoogleCalendar";
import { compileView } from "../../src/views/ViewCompiler";
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
    it("has correct ACL mappings for all trust tiers", () => {
        expect(googleCalendar.acl.owner).toBe("full");
        expect(googleCalendar.acl.verified).toBe("free_busy");
        expect(googleCalendar.acl.guest).toBe("free_busy");
        expect(googleCalendar.acl.external).toBe("free_busy");
    });

    it("free_busy view strips titles and details", async () => {
        const expr = compileView(googleCalendar.views.free_busy);
        const result = await transform(expr, calendarApiResponse);
        const items = result as Array<Record<string, unknown>>;
        expect(items).toHaveLength(2);
        expect(items[0].title).toBe("Busy");
        expect(items[0]).toHaveProperty("start");
        expect(items[0]).toHaveProperty("end");
        expect(items[0]).toHaveProperty("status");
        expect(items[0]).not.toHaveProperty("description");
        expect(items[0]).not.toHaveProperty("attendees");
    });

    it("metadata view includes attendee count but not names", async () => {
        const expr = compileView(googleCalendar.views.metadata);
        const result = await transform(expr, calendarApiResponse);
        const items = result as Array<Record<string, unknown>>;
        expect(items[0]).toHaveProperty("attendee_count", 2);
        expect(items[0]).not.toHaveProperty("attendees");
        expect(items[0]).not.toHaveProperty("title");
    });

    it("summary view returns aggregate counts", async () => {
        const expr = compileView(googleCalendar.views.summary);
        const result = await transform(expr, calendarApiResponse);
        expect(result).toEqual({ total_events: 2, busy_hours: 2.5 });
    });

    it("full view passes through everything", async () => {
        const expr = compileView(googleCalendar.views.full);
        const result = await transform(expr, calendarApiResponse);
        expect(result).toEqual(calendarApiResponse);
    });

    it("has aliases for composio-style execute_tool", () => {
        expect(googleCalendar.aliases).toEqual([{ tool: "execute_tool", provider: "google_calendar" }]);
    });
});
