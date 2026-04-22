import type { PolicyRule } from "../Types";

export const gmail: PolicyRule = {
    name: "Gmail",
    match: 'tool = "email" or (tool = "execute_tool" and params.provider = "gmail")',
    disclosure: {
        owner: "full",
        verified: "metadata_only",
        guest: "metadata_only",
        external: "none"
    },
    disclosure_levels: {
        metadata_only: {
            transform: `messages.{
                "from": payload.headers[name='From'].value,
                "subject": payload.headers[name='Subject'].value,
                "date": payload.headers[name='Date'].value,
                "has_attachments": $count(payload.parts[filename != '']) > 0
            }`
        },
        summary_only: {
            transform: '{ "total_messages": $count(messages), "unread": $count(messages[labelIds = "UNREAD"]) }'
        },
        full: {
            transform: "$$"
        },
        none: {
            transform: '{ "status": "access_denied", "reason": "insufficient_trust_level" }'
        }
    }
};
