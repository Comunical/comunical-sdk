import type { ExecuteResult, ToolHandler, GuardConfig, ConversationContext, ToolAccess } from "../Types";
import type { AuditEntry } from "../audit/Logger";
import { checkGrant } from "./GrantChecker";
import { matchRule } from "./RuleMatcher";
import { resolveDisclosureLevel } from "./DisclosureResolver";
import { transform } from "./Transformer";

export interface PipelineResult extends ExecuteResult {
    audit: AuditEntry;
}

function resolveToolAccess(toolName: string, config: GuardConfig): ToolAccess {
    const toolConfig = config.tools[toolName];
    return toolConfig?.access ?? config.default_access;
}

function buildAuditEntry(toolName: string, access: string, status: string, disclosureLevel: string, participantCount: number, reason?: string): AuditEntry {
    return {
        timestamp: new Date().toISOString(),
        tool: toolName,
        access,
        disclosure_level: disclosureLevel,
        status,
        participant_count: participantCount,
        reason
    };
}

export async function executePipeline(
    toolName: string,
    handler: ToolHandler,
    params: Record<string, unknown>,
    guardConfig: GuardConfig,
    context: ConversationContext
): Promise<PipelineResult> {
    const participantCount = Object.keys(context.participants).length;

    if (!(toolName in guardConfig.tools)) {
        const reason = `Tool "${toolName}" is not registered in guard config`;
        return {
            status: "denied",
            reason,
            audit: buildAuditEntry(toolName, "unknown", "denied", "none", participantCount, reason)
        };
    }

    const access = resolveToolAccess(toolName, guardConfig);

    const grantResult = checkGrant(toolName, access, context);
    if (!grantResult.granted) {
        const status = grantResult.reason === "permission_required" ? "permission_required" as const : "denied" as const;
        return {
            status,
            reason: grantResult.reason,
            audit: buildAuditEntry(toolName, access, status, "none", participantCount, grantResult.reason)
        };
    }

    const rule = await matchRule({ tool: toolName, params }, guardConfig.policies.rules);
    if (!rule) {
        if (access === "open") {
            const rawData = await handler(params);
            return {
                status: "ok",
                data: rawData,
                audit: buildAuditEntry(toolName, access, "ok", "full", participantCount)
            };
        }
        const reason = `No matching policy rule for tool "${toolName}"`;
        return {
            status: "denied",
            reason,
            audit: buildAuditEntry(toolName, access, "denied", "none", participantCount, reason)
        };
    }

    const disclosureLevel = resolveDisclosureLevel(rule, context.participants);

    const rawData = await handler(params);

    const transformExpression = rule.disclosure_levels?.[disclosureLevel]?.transform;
    if (!transformExpression) {
        const reason = `No transform defined for disclosure level "${disclosureLevel}"`;
        return {
            status: "denied",
            reason,
            audit: buildAuditEntry(toolName, access, "denied", disclosureLevel, participantCount, reason)
        };
    }

    const transformedData = await transform(transformExpression, rawData);
    return {
        status: "ok",
        data: transformedData,
        audit: buildAuditEntry(toolName, access, "ok", disclosureLevel, participantCount)
    };
}
