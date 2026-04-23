import { describe, it, expect, vi } from "vitest";
import { detectImplicitGrant } from "../../src/grants/ImplicitDetector";
import type { MessageEnvelope, Participant, ToolExecutionRequest, LlmCallback } from "../../src/Types";

const participants: Record<string, Participant> = {
    "jim@acme.com": { role: "human", trust: "owner" },
    "alex@agent": { role: "agent", trust: "owner" },
    "bill@counterparty.com": { role: "human", trust: "external" }
};

const calendarRequest: ToolExecutionRequest = {
    name: "calendar",
    description: "Access calendar events for scheduling",
    params: { timeMin: "2026-04-21" }
};

function createMockLlm(response: string): LlmCallback {
    return vi.fn(async () => response);
}

describe("ImplicitDetector — LLM-powered", () => {
    describe("grants when LLM says yes", () => {
        it("detects implicit grant when LLM responds 'yes'", async () => {
            const llm = createMockLlm("yes");
            const messages: MessageEnvelope[] = [
                { from: "jim@acme.com", to: ["alex@agent", "bill@counterparty.com"], body: "Find a time for Bill and me to meet", timestamp: "2026-04-21T14:00:00Z" }
            ];
            const result = await detectImplicitGrant(messages, calendarRequest, participants, llm);
            expect(result).toBe(true);
        });

        it("handles 'Yes' case-insensitively", async () => {
            const llm = createMockLlm("Yes");
            const messages: MessageEnvelope[] = [{ from: "jim@acme.com", to: ["alex@agent"], body: "Check my schedule", timestamp: "2026-04-21T14:00:00Z" }];
            const result = await detectImplicitGrant(messages, calendarRequest, participants, llm);
            expect(result).toBe(true);
        });
    });

    describe("denies when LLM says no", () => {
        it("denies when LLM responds 'no'", async () => {
            const llm = createMockLlm("no");
            const messages: MessageEnvelope[] = [{ from: "jim@acme.com", to: ["alex@agent"], body: "What's the weather?", timestamp: "2026-04-21T14:00:00Z" }];
            const result = await detectImplicitGrant(messages, calendarRequest, participants, llm);
            expect(result).toBe(false);
        });
    });

    describe("structural enforcement — skips LLM for invalid senders", () => {
        it("denies without calling LLM when sender is an agent", async () => {
            const llm = createMockLlm("yes");
            const messages: MessageEnvelope[] = [{ from: "alex@agent", to: ["jim@acme.com"], body: "I'll schedule a meeting for you", timestamp: "2026-04-21T14:00:00Z" }];
            const result = await detectImplicitGrant(messages, calendarRequest, participants, llm);
            expect(result).toBe(false);
            expect(llm).not.toHaveBeenCalled();
        });

        it("denies without calling LLM when sender is a non-owner human", async () => {
            const llm = createMockLlm("yes");
            const messages: MessageEnvelope[] = [{ from: "bill@counterparty.com", to: ["alex@agent"], body: "Schedule a meeting with Jim", timestamp: "2026-04-21T14:00:00Z" }];
            const result = await detectImplicitGrant(messages, calendarRequest, participants, llm);
            expect(result).toBe(false);
            expect(llm).not.toHaveBeenCalled();
        });

        it("denies without calling LLM when no messages exist", async () => {
            const llm = createMockLlm("yes");
            const result = await detectImplicitGrant([], calendarRequest, participants, llm);
            expect(result).toBe(false);
            expect(llm).not.toHaveBeenCalled();
        });
    });

    describe("prompt construction", () => {
        it("includes tool name and description in the LLM prompt", async () => {
            const llm = createMockLlm("yes");
            const messages: MessageEnvelope[] = [{ from: "jim@acme.com", to: ["alex@agent"], body: "Find a time to meet", timestamp: "2026-04-21T14:00:00Z" }];
            await detectImplicitGrant(messages, calendarRequest, participants, llm);
            const prompt = (llm as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
            expect(prompt).toContain("calendar");
            expect(prompt).toContain("Access calendar events for scheduling");
        });

        it("includes the owner's messages in the prompt", async () => {
            const llm = createMockLlm("yes");
            const messages: MessageEnvelope[] = [{ from: "jim@acme.com", to: ["alex@agent"], body: "Find a time for Bill and me to meet", timestamp: "2026-04-21T14:00:00Z" }];
            await detectImplicitGrant(messages, calendarRequest, participants, llm);
            const prompt = (llm as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
            expect(prompt).toContain("Find a time for Bill and me to meet");
        });

        it("identifies the data owner in the prompt", async () => {
            const llm = createMockLlm("yes");
            const messages: MessageEnvelope[] = [{ from: "jim@acme.com", to: ["alex@agent"], body: "Check my calendar", timestamp: "2026-04-21T14:00:00Z" }];
            await detectImplicitGrant(messages, calendarRequest, participants, llm);
            const prompt = (llm as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
            expect(prompt).toContain("jim@acme.com");
        });

        it("excludes agent messages from the prompt context", async () => {
            const llm = createMockLlm("yes");
            const messages: MessageEnvelope[] = [
                { from: "alex@agent", to: ["jim@acme.com"], body: "I'll check your calendar now", timestamp: "2026-04-21T14:00:00Z" },
                { from: "jim@acme.com", to: ["alex@agent"], body: "Find a time to meet", timestamp: "2026-04-21T14:01:00Z" }
            ];
            await detectImplicitGrant(messages, calendarRequest, participants, llm);
            const prompt = (llm as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
            expect(prompt).toContain("Find a time to meet");
            expect(prompt).not.toContain("I'll check your calendar now");
        });
    });
});
