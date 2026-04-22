import type { Participant, TrustTier } from "../Types";

const TRUST_TIER_RANK: Record<TrustTier, number> = {
    owner: 3,
    verified: 2,
    guest: 1,
    external: 0
};

export function getLowestTrustTier(participants: Record<string, Participant>): TrustTier {
    let lowest: TrustTier = "owner";
    let lowestRank = TRUST_TIER_RANK.owner;

    for (const participant of Object.values(participants)) {
        const rank = TRUST_TIER_RANK[participant.trust];
        if (rank < lowestRank) {
            lowestRank = rank;
            lowest = participant.trust;
        }
    }

    return lowest;
}
