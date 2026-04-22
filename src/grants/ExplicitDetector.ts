import type { MessageEnvelope, Participant } from "../Types";

export function detectExplicitGrant(_messages: MessageEnvelope[], _toolName: string, _participants: Record<string, Participant>): boolean {
    throw new Error("not implemented");
}
