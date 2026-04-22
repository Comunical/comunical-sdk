import type { ExecuteResult, ToolHandler, GuardConfig, ConversationContext, ToolAccess } from "../Types";
import { checkGrant } from "./GrantChecker";
import { matchRule } from "./RuleMatcher";
import { resolveDisclosureLevel } from "./DisclosureResolver";
import { transform } from "./Transformer";

function resolveToolAccess(toolName: string, config: GuardConfig): ToolAccess {
    const toolConfig = config.tools[toolName];
    return toolConfig?.access ?? config.default_access;
}

export async function executePipeline(
    toolName: string,
    handler: ToolHandler,
    params: Record<string, unknown>,
    guardConfig: GuardConfig,
    context: ConversationContext
): Promise<ExecuteResult> {
    const access = resolveToolAccess(toolName, guardConfig);

    // Step 1: Grant check (includes identity verification and revocation)
    const grantResult = checkGrant(toolName, access, context);
    if (!grantResult.granted) {
        const status = grantResult.reason === "permission_required" ? "permission_required" as const : "denied" as const;
        return { status, reason: grantResult.reason };
    }

    // Step 2: Rule matching (open tools still need a rule for transformation)
    const rule = await matchRule({ tool: toolName, params }, guardConfig.policies.rules);
    if (!rule) {
        if (access === "open") {
            const rawData = await handler(params);
            return { status: "ok", data: rawData };
        }
        return { status: "denied", reason: `No matching policy rule for tool "${toolName}"` };
    }

    // Step 3: Disclosure resolution
    const disclosureLevel = resolveDisclosureLevel(rule, context.participants);

    // Step 4: Execute the handler
    const rawData = await handler(params);

    // Step 5: Transform
    const transformExpression = rule.disclosure_levels?.[disclosureLevel]?.transform;
    if (!transformExpression) {
        return { status: "denied", reason: `No transform defined for disclosure level "${disclosureLevel}"` };
    }

    const transformedData = await transform(transformExpression, rawData);
    return { status: "ok", data: transformedData };
}
