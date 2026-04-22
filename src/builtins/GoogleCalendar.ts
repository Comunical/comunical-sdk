import type { RuleConfig } from "../Types";

export const googleCalendar: RuleConfig = {
    aliases: [{ tool: "execute_tool", provider: "google_calendar" }],

    acl: {
        owner: "full",
        verified: "free_busy",
        guest: "free_busy",
        external: "free_busy"
    },

    views: {
        full: "*",

        free_busy: {
            include: ["items.start", "items.end", "items.status"],
            replace: { "items.title": "Busy" }
        },

        metadata: {
            include: ["items.start", "items.end", "items.status"],
            compute: { "items.attendee_count": "count(items.attendees)" }
        },

        summary: {
            transform: '{ "total_events": $count(items), "busy_hours": $sum(items.(($toMillis(end.dateTime) - $toMillis(start.dateTime)) / 3600000)) }'
        }
    }
};
