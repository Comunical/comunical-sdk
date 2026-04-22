import { describe, it, expect } from "vitest";
import { compileView } from "../../src/views/ViewCompiler";
import { transform } from "../../src/engine/Transformer";

const calendarData = {
    items: [
        {
            start: { dateTime: "2026-04-21T10:00:00Z" },
            end: { dateTime: "2026-04-21T11:00:00Z" },
            status: "confirmed",
            title: "Board Meeting",
            attendees: [{ email: "jim@acme.com" }, { email: "cfo@acme.com" }],
            description: "Quarterly board review"
        },
        {
            start: { dateTime: "2026-04-21T14:00:00Z" },
            end: { dateTime: "2026-04-21T15:00:00Z" },
            status: "tentative",
            title: "1:1 with Legal",
            attendees: [{ email: "jim@acme.com" }],
            description: "Review contracts"
        }
    ]
};

const emailData = {
    messages: [
        { from: "alice@acme.com", subject: "Q4 Revenue", date: "2026-04-20", attachments: [{ name: "report.pdf" }], body: "Confidential figures..." },
        { from: "bob@acme.com", subject: "Lunch?", date: "2026-04-20", attachments: [], body: "Want to grab lunch?" }
    ]
};

describe("ViewCompiler — compileView", () => {
    describe("shorthand views", () => {
        it('compiles "*" to full passthrough ($$)', () => {
            expect(compileView("*")).toBe("$$");
        });

        it('"*" passes through all data unchanged', async () => {
            const expr = compileView("*");
            const result = await transform(expr, calendarData);
            expect(result).toEqual(calendarData);
        });

        it('compiles "deny" to access denied response', () => {
            const expr = compileView("deny");
            expect(expr).toContain("access_denied");
        });

        it('"deny" returns an access_denied object', async () => {
            const expr = compileView("deny");
            const result = await transform(expr, calendarData);
            expect(result).toEqual({ status: "access_denied", reason: "insufficient_trust_level" });
        });
    });

    describe("declarative views with include", () => {
        it("compiles include fields into a JSONata projection", () => {
            const expr = compileView({
                include: ["items.start", "items.end", "items.status"]
            });
            expect(typeof expr).toBe("string");
            expect(expr.length).toBeGreaterThan(0);
        });

        it("include selects only the listed fields", async () => {
            const expr = compileView({
                include: ["items.start", "items.end", "items.status"]
            });
            const result = await transform(expr, calendarData);
            const items = result as Array<Record<string, unknown>>;
            expect(items).toHaveLength(2);
            expect(items[0]).toHaveProperty("start");
            expect(items[0]).toHaveProperty("end");
            expect(items[0]).toHaveProperty("status");
            expect(items[0]).not.toHaveProperty("title");
            expect(items[0]).not.toHaveProperty("attendees");
            expect(items[0]).not.toHaveProperty("description");
        });
    });

    describe("declarative views with replace", () => {
        it("replaces a field value with a constant", async () => {
            const expr = compileView({
                include: ["items.start", "items.end", "items.status"],
                replace: { "items.title": "Busy" }
            });
            const result = await transform(expr, calendarData);
            const items = result as Array<Record<string, unknown>>;
            expect(items[0].title).toBe("Busy");
            expect(items[1].title).toBe("Busy");
        });

        it("included fields pass through while replaced fields get the constant", async () => {
            const expr = compileView({
                include: ["items.start", "items.end", "items.status"],
                replace: { "items.title": "Busy" }
            });
            const result = await transform(expr, calendarData);
            const items = result as Array<Record<string, unknown>>;
            expect(items[0].start).toEqual({ dateTime: "2026-04-21T10:00:00Z" });
            expect(items[0].title).toBe("Busy");
        });
    });

    describe("declarative views with compute", () => {
        it("computes a count field", async () => {
            const expr = compileView({
                include: ["items.start", "items.end", "items.status"],
                compute: { "items.attendee_count": "count(items.attendees)" }
            });
            const result = await transform(expr, calendarData);
            const items = result as Array<Record<string, unknown>>;
            expect(items[0].attendee_count).toBe(2);
            expect(items[1].attendee_count).toBe(1);
        });

        it("computes a boolean flag", async () => {
            const expr = compileView({
                include: ["messages.from", "messages.subject", "messages.date"],
                compute: { "messages.has_attachments": "count(messages.attachments) > 0" }
            });
            const result = await transform(expr, emailData);
            const messages = result as Array<Record<string, unknown>>;
            expect(messages[0].has_attachments).toBe(true);
            expect(messages[1].has_attachments).toBe(false);
        });
    });

    describe("escape hatch — raw JSONata transform", () => {
        it("passes through a transform string unchanged", () => {
            const jsonataExpr = '{ "total_events": $count(items) }';
            const expr = compileView({ transform: jsonataExpr });
            expect(expr).toBe(jsonataExpr);
        });

        it("raw transform executes correctly", async () => {
            const expr = compileView({
                transform: '{ "total_events": $count(items), "busy_hours": $sum(items.(($toMillis(end.dateTime) - $toMillis(start.dateTime)) / 3600000)) }'
            });
            const result = await transform(expr, calendarData);
            expect(result).toEqual({ total_events: 2, busy_hours: 2 });
        });
    });

    describe("mixed include + replace + compute", () => {
        it("combines all three in one view", async () => {
            const expr = compileView({
                include: ["items.start", "items.end", "items.status"],
                replace: { "items.title": "Busy" },
                compute: { "items.attendee_count": "count(items.attendees)" }
            });
            const result = await transform(expr, calendarData);
            const items = result as Array<Record<string, unknown>>;
            expect(items[0]).toEqual({
                start: { dateTime: "2026-04-21T10:00:00Z" },
                end: { dateTime: "2026-04-21T11:00:00Z" },
                status: "confirmed",
                title: "Busy",
                attendee_count: 2
            });
        });
    });

    describe("edge cases", () => {
        it("throws on empty include array", () => {
            expect(() => compileView({ include: [] })).toThrow();
        });

        it("works with a single include field", async () => {
            const expr = compileView({ include: ["items.start"] });
            const result = await transform(expr, calendarData);
            const items = result as Array<Record<string, unknown>>;
            expect(items[0]).toEqual({ start: { dateTime: "2026-04-21T10:00:00Z" } });
            expect(items[0]).not.toHaveProperty("title");
        });
    });
});
