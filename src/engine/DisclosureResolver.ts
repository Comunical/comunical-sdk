import type { PolicyRule, Participant, TrustTier } from "../Types";

export function resolveDisclosureLevel(_rule: PolicyRule, _participants: Record<string, Participant>): string {
    throw new Error("not implemented");
}

export function getLowestTrustTier(_participants: Record<string, Participant>): TrustTier {
    throw new Error("not implemented");
}
