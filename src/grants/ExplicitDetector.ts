import type { MessageEnvelope, Participant } from "../Types";

const AFFIRMATIVE_PATTERNS = [
    /\byes\b/i,
    /\byep\b/i,
    /\byeah\b/i,
    /\bsure\b/i,
    /\bgo ahead\b/i,
    /\bapproved?\b/i,
    /\bconfirm(ed)?\b/i,
    /\bgrant(ed)?\b/i,
    /\ballow(ed)?\b/i,
    /\bok(ay)?\b/i,
    /\bthat'?s? fine\b/i,
    /\bplease do\b/i,
    /\bdo it\b/i
];

function isAffirmative(body: string): boolean {
    return AFFIRMATIVE_PATTERNS.some(pattern => pattern.test(body));
}

export function detectExplicitGrant(messages: MessageEnvelope[], _toolName: string, participants: Record<string, Participant>): boolean {
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

        if (isAffirmative(message.body)) {
            return true;
        }
    }
    return false;
}
