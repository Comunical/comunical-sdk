import type { RuleConfig } from "../Types";

export const gmail: RuleConfig = {
    aliases: [{ tool: "execute_tool", provider: "gmail" }],

    acl: {
        owner: "full",
        verified: "headers",
        guest: "headers",
        external: "deny"
    },

    views: {
        full: "*",

        headers: {
            include: ["messages.from", "messages.subject", "messages.date"],
            compute: { "messages.has_attachments": "count(messages.attachments) > 0" }
        },

        summary: {
            transform: '{ "total_messages": $count(messages), "unread": $count(messages[labelIds = "UNREAD"]) }'
        },

        deny: "deny"
    }
};
