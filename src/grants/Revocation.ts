import type { MessageEnvelope } from "../Types";

export function isGrantorPresent(grantorId: string, latestMessage: MessageEnvelope): boolean {
    if (latestMessage.from === grantorId) {
        return true;
    }
    if (latestMessage.to.includes(grantorId)) {
        return true;
    }
    if (latestMessage.cc?.includes(grantorId)) {
        return true;
    }
    return false;
}
