import type { MessageEnvelope, Participant, ToolExecutionRequest, LlmCallback } from "../Types";

function findOwnerIds(participants: Record<string, Participant>): string[] {
    return Object.entries(participants)
        .filter(([_, p]) => p.role === "human" && p.trust === "owner")
        .map(([id]) => id);
}

function getHumanMessages(messages: MessageEnvelope[], participants: Record<string, Participant>): MessageEnvelope[] {
    return messages.filter(msg => {
        const participant = participants[msg.from];
        return participant && participant.role === "human";
    });
}

function buildPrompt(humanMessages: MessageEnvelope[], toolRequest: ToolExecutionRequest, ownerIds: string[]): string {
    const messageLines = humanMessages.map(msg => `  ${msg.from}: "${msg.body}"`).join("\n");

    return `Given the following conversation and tool call, determine if the data owner implicitly authorized use of this tool.

Tool being called:
  Name: ${toolRequest.name}
  Description: ${toolRequest.description}

Data owner(s): ${ownerIds.join(", ")}
Only a data owner's message can authorize tool usage.

Recent messages from human participants:
${messageLines}

Did the data owner's message(s) imply intent to use this tool? Respond with only "yes" or "no".`;
}

export async function detectImplicitGrant(
    messages: MessageEnvelope[],
    toolRequest: ToolExecutionRequest,
    participants: Record<string, Participant>,
    llm: LlmCallback
): Promise<boolean> {
    if (messages.length === 0) {
        return false;
    }

    const ownerIds = findOwnerIds(participants);
    if (ownerIds.length === 0) {
        return false;
    }

    const latestMessage = messages[messages.length - 1];
    const latestSender = participants[latestMessage.from];
    if (!latestSender || latestSender.role !== "human" || latestSender.trust !== "owner") {
        return false;
    }

    const humanMessages = getHumanMessages(messages, participants);
    if (humanMessages.length === 0) {
        return false;
    }

    const prompt = buildPrompt(humanMessages, toolRequest, ownerIds);
    const response = await llm(prompt);
    return response.trim().toLowerCase().startsWith("yes");
}
