import type { PolicyRule } from "../Types";

export interface ToolCallData {
    tool: string;
    params: Record<string, unknown>;
}

export function matchRule(_toolCall: ToolCallData, _rules: PolicyRule[]): PolicyRule | null {
    throw new Error("not implemented");
}
