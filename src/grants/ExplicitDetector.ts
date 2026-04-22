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

const NEGATION_PATTERNS = [
    /\bno\b/i,
    /\bnot\b/i,
    /\bnope\b/i,
    /\bdon'?t\b/i,
    /\bdo not\b/i,
    /\bnever\b/i,
    /\bdeny\b/i,
    /\bdenied\b/i,
    /\brefuse[ds]?\b/i,
    /\bdecline[ds]?\b/i,
    /\babsolutely not\b/i
];

function hasNegation(body: string): boolean {
    return NEGATION_PATTERNS.some(pattern => pattern.test(body));
}

function isAffirmative(body: string): boolean {
    if (hasNegation(body)) {
        return false;
    }
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
