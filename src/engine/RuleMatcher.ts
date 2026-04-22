import jsonata from "jsonata";
import type { PolicyRule } from "../Types";
import { compileMatchSugar } from "../match/SugarCompiler";

export interface ToolCallData {
    tool: string;
    params: Record<string, unknown>;
}

function getMatchExpression(rule: PolicyRule): string {
    if (typeof rule.match === "string") {
        return rule.match;
    }
    return compileMatchSugar(rule.match);
}

export async function matchRule(toolCall: ToolCallData, rules: PolicyRule[]): Promise<PolicyRule | null> {
    for (const rule of rules) {
        const expression = getMatchExpression(rule);
        const compiled = jsonata(expression);
        const result = await compiled.evaluate(toolCall);
        if (result === true) {
            return rule;
        }
    }
    return null;
}
