import { describe, it, expect } from "vitest";
import { transform } from "../../src/engine/Transformer";

const calendarResponse = {
    items: [
        {
            start: { dateTime: "2026-04-21T10:00:00Z" },
            end: { dateTime: "2026-04-21T11:00:00Z" },
            status: "confirmed",
            title: "Board Meeting",
            attendees: [{ email: "jim@acme.com" }, { email: "cfo@acme.com" }]
        },
        {
            start: { dateTime: "2026-04-21T14:00:00Z" },
            end: { dateTime: "2026-04-21T15:00:00Z" },
            status: "confirmed",
            title: "1:1 with Legal",
            attendees: [{ email: "jim@acme.com" }, { email: "legal@acme.com" }]
        }
    ]
};

const emailResponse = {
    messages: [
        {
            id: "msg1",
            payload: {
                headers: [
                    { name: "From", value: "alice@acme.com" },
                    { name: "Subject", value: "Q4 Revenue" },
                    { name: "Date", value: "2026-04-20T09:00:00Z" }
                ],
                parts: [{ filename: "report.pdf" }]
            },
            body: "Here's the Q4 revenue report..."
        },
        {
            id: "msg2",
            payload: {
                headers: [
                    { name: "From", value: "bob@acme.com" },
                    { name: "Subject", value: "Lunch?" },
                    { name: "Date", value: "2026-04-20T12:00:00Z" }
                ],
                parts: []
            },
            body: "Want to grab lunch?"
        }
    ]
};

describe("Transformer", () => {
    it("applies free_busy_only transform to calendar data", async () => {
        const expression = 'items.{ "start": start, "end": end, "status": status, "title": "Busy" }';
        const result = await transform(expression, calendarResponse);
        expect(result).toEqual([
            { start: { dateTime: "2026-04-21T10:00:00Z" }, end: { dateTime: "2026-04-21T11:00:00Z" }, status: "confirmed", title: "Busy" },
            { start: { dateTime: "2026-04-21T14:00:00Z" }, end: { dateTime: "2026-04-21T15:00:00Z" }, status: "confirmed", title: "Busy" }
        ]);
    });

    it("applies metadata_only transform to calendar data (with attendee count)", async () => {
        const expression = 'items.{ "start": start, "end": end, "status": status, "attendee_count": $count(attendees) }';
        const result = await transform(expression, calendarResponse);
        expect(result).toEqual([
            { start: { dateTime: "2026-04-21T10:00:00Z" }, end: { dateTime: "2026-04-21T11:00:00Z" }, status: "confirmed", attendee_count: 2 },
            { start: { dateTime: "2026-04-21T14:00:00Z" }, end: { dateTime: "2026-04-21T15:00:00Z" }, status: "confirmed", attendee_count: 2 }
        ]);
    });

    it("applies summary_only transform to calendar data", async () => {
        const expression = '{ "total_events": $count(items), "busy_hours": $sum(items.(($toMillis(end.dateTime) - $toMillis(start.dateTime)) / 3600000)) }';
        const result = await transform(expression, calendarResponse);
        expect(result).toEqual({ total_events: 2, busy_hours: 2 });
    });

    it("applies full passthrough with $$", async () => {
        const result = await transform("$$", calendarResponse);
        expect(result).toEqual(calendarResponse);
    });

    it("applies metadata_only transform to email data", async () => {
        const expression = `messages.{
            "from": payload.headers[name='From'].value,
            "subject": payload.headers[name='Subject'].value,
            "date": payload.headers[name='Date'].value,
            "has_attachments": $count(payload.parts[filename != '']) > 0
        }`;
        const result = await transform(expression, emailResponse);
        expect(result).toEqual([
            { from: "alice@acme.com", subject: "Q4 Revenue", date: "2026-04-20T09:00:00Z", has_attachments: true },
            { from: "bob@acme.com", subject: "Lunch?", date: "2026-04-20T12:00:00Z", has_attachments: false }
        ]);
    });

    it("returns a denied message for 'none' disclosure", async () => {
        const expression = '{ "status": "access_denied", "reason": "insufficient_trust_level" }';
        const result = await transform(expression, calendarResponse);
        expect(result).toEqual({ status: "access_denied", reason: "insufficient_trust_level" });
    });

    it("strips fields not included in the transform (default closed)", async () => {
        const expression = 'items.{ "start": start }';
        const result = await transform(expression, calendarResponse);
        const items = result as Array<Record<string, unknown>>;
        expect(items[0]).not.toHaveProperty("title");
        expect(items[0]).not.toHaveProperty("attendees");
        expect(items[0]).toHaveProperty("start");
    });

    it("throws TransformationError for invalid expressions", async () => {
        await expect(transform(")))invalid(((", {})).rejects.toThrow();
    });
});
