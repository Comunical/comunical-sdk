import type { ToolAccess, ConversationContext, IdentityVerification } from "../Types";
import { isGrantorPresent } from "../grants/Revocation";
import { detectExplicitGrant } from "../grants/ExplicitDetector";

export interface GrantCheckResult {
    granted: boolean;
    reason?: string;
}

const ALLOWED_ACCESS_BY_VERIFICATION: Record<IdentityVerification, Set<ToolAccess>> = {
    verified: new Set(["open", "owner_only", "explicit", "implicit"]),
    assumed: new Set(["open", "owner_only", "explicit"]),
    unverified: new Set(["open"])
};

function getEffectiveVerification(participantId: string, context: ConversationContext): IdentityVerification {
    const participant = context.participants[participantId];
    return participant?.identity_verification ?? context.identity_verification;
}

function findOwners(context: ConversationContext): string[] {
    return Object.entries(context.participants)
        .filter(([_, p]) => p.trust === "owner" && p.role === "human")
        .map(([id]) => id);
}

export function checkGrant(toolName: string, access: ToolAccess, context: ConversationContext): GrantCheckResult {
    if (access === "open") {
        return { granted: true };
    }

    const latestMessage = context.messages[context.messages.length - 1];
    const senderId = latestMessage.from;

    if (!context.participants[senderId]) {
        return { granted: false, reason: "unknown_participant" };
    }

    const senderVerification = getEffectiveVerification(senderId, context);
    const allowedModes = ALLOWED_ACCESS_BY_VERIFICATION[senderVerification];

    if (!allowedModes.has(access)) {
        return { granted: false, reason: "insufficient_identity_verification" };
    }

    const owners = findOwners(context);

    if (access === "owner_only") {
        const senderParticipant = context.participants[senderId];
        if (!senderParticipant || senderParticipant.role !== "human" || senderParticipant.trust !== "owner") {
            return { granted: false, reason: `Tool "${toolName}" requires owner_only access` };
        }
        return { granted: true };
    }

    if (access === "explicit") {
        const hasOwnerOnLatest = owners.some(ownerId => isGrantorPresent(ownerId, latestMessage));
        if (!hasOwnerOnLatest) {
            return { granted: false, reason: "permission_required" };
        }

        if (detectExplicitGrant(context.messages, toolName, context.participants)) {
            return { granted: true };
        }
        return { granted: false, reason: "permission_required" };
    }

    if (access === "implicit") {
        void toolName;
        return { granted: false, reason: "implicit_grant_not_implemented" };
    }

    return { granted: false, reason: `Unknown access mode: ${access}` };
}
