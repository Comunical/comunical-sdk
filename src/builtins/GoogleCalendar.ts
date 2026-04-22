import type { PolicyRule } from "../Types";

export const googleCalendar: PolicyRule = {
    name: "Google Calendar",
    match: 'tool = "calendar" or (tool = "execute_tool" and params.provider = "google_calendar")',
    disclosure: {
        owner: "full",
        verified: "free_busy_only",
        guest: "free_busy_only",
        external: "free_busy_only"
    },
    disclosure_levels: {
        free_busy_only: {
            transform: 'items.{ "start": start, "end": end, "status": status, "title": "Busy" }'
        },
        metadata_only: {
            transform: 'items.{ "start": start, "end": end, "status": status, "attendee_count": $count(attendees) }'
        },
        summary_only: {
            transform: '{ "total_events": $count(items), "busy_hours": $sum(items.(($toMillis(end.dateTime) - $toMillis(start.dateTime)) / 3600000)) }'
        },
        full: {
            transform: "$$"
        }
    }
};
