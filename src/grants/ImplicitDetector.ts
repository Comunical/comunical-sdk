import type { MessageEnvelope, Participant } from "../Types";

const TOOL_INTENT_PATTERNS: Record<string, RegExp[]> = {
    calendar: [
        /\b(schedule|scheduling)\b/i,
        /\b(find|check|look).{0,20}(time|slot|availability|calendar|meeting)\b/i,
        /\b(set up|book|arrange).{0,20}(meeting|call|appointment)\b/i,
        /\bwhen.{0,20}(free|available|open)\b/i,
        /\bmy calendar\b/i
    ],
    email: [
        /\b(send|draft|compose|write).{0,20}(email|message|mail)\b/i,
        /\b(check|read|look).{0,20}(inbox|email|mail)\b/i,
        /\bmy (inbox|email|mail)\b/i,
        /\breply to\b/i,
        /\bforward.{0,20}(email|message|mail)\b/i
    ]
};

function hasIntent(body: string, toolName: string): boolean {
    const patterns = TOOL_INTENT_PATTERNS[toolName];
    if (!patterns) {
        return false;
    }
    return patterns.some(pattern => pattern.test(body));
}

export function detectImplicitGrant(messages: MessageEnvelope[], toolName: string, participants: Record<string, Participant>): boolean {
    for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        const participant = participants[message.from];

        if (!participant) {
            continue;
        }
        if (participant.role !== "human") {
            continue;
        }
        if (participant.trust !== "owner") {
            continue;
        }

        return hasIntent(message.body, toolName);
    }
    return false;
}
