import type { ToolAccess, ConversationContext, Participant } from "../Types";

export interface GrantCheckResult {
    granted: boolean;
    reason?: string;
}

export function checkGrant(_toolName: string, _access: ToolAccess, _context: ConversationContext, _participants: Record<string, Participant>): GrantCheckResult {
    throw new Error("not implemented");
}
