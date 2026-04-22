import type { ExecuteResult, ToolHandler, GuardConfig, ConversationContext, ToolAccess, RuleConfig } from "../Types";
import type { AuditEntry } from "../audit/Logger";
import { checkGrant } from "./GrantChecker";
import { getLowestTrustTier } from "./DisclosureResolver";
import { transform } from "./Transformer";
import { compileView } from "../views/ViewCompiler";

export interface PipelineResult extends ExecuteResult {
    audit: AuditEntry;
}

function resolveToolAccess(toolName: string, config: GuardConfig): ToolAccess {
    const toolConfig = config.tools[toolName];
    return toolConfig?.access ?? config.default_access;
}

function buildAuditEntry(toolName: string, access: string, status: string, viewName: string, participantCount: number, reason?: string): AuditEntry {
    return {
        timestamp: new Date().toISOString(),
        tool: toolName,
        access,
        disclosure_level: viewName,
        status,
        participant_count: participantCount,
        reason
    };
}

function findRule(toolName: string, params: Record<string, unknown>, guardConfig: GuardConfig): RuleConfig | null {
    if (guardConfig.rules[toolName]) {
        return guardConfig.rules[toolName];
    }

    for (const [, rule] of Object.entries(guardConfig.rules)) {
        if (rule.aliases) {
            for (const alias of rule.aliases) {
                if (alias.tool === toolName && (params as Record<string, unknown>).provider === alias.provider) {
                    return rule;
                }
            }
        }
    }

    return null;
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
        const status = grantResult.reason === "permission_required" ? ("permission_required" as const) : ("denied" as const);
        return {
            status,
            reason: grantResult.reason,
            audit: buildAuditEntry(toolName, access, status, "none", participantCount, grantResult.reason)
        };
    }

    const rule = findRule(toolName, params, guardConfig);
    if (!rule) {
        if (access === "open") {
            const rawData = await handler(params);
            return {
                status: "ok",
                data: rawData,
                audit: buildAuditEntry(toolName, access, "ok", "full", participantCount)
            };
        }
        const reason = `No rule found for tool "${toolName}"`;
        return {
            status: "denied",
            reason,
            audit: buildAuditEntry(toolName, access, "denied", "none", participantCount, reason)
        };
    }

    const lowestTier = getLowestTrustTier(context.participants);
    const viewName = rule.acl[lowestTier];

    if (!viewName) {
        const reason = `No ACL entry for trust tier "${lowestTier}"`;
        return {
            status: "denied",
            reason,
            audit: buildAuditEntry(toolName, access, "denied", "none", participantCount, reason)
        };
    }

    const viewDef = rule.views[viewName];
    if (!viewDef) {
        const reason = `No view definition for "${viewName}"`;
        return {
            status: "denied",
            reason,
            audit: buildAuditEntry(toolName, access, "denied", viewName, participantCount, reason)
        };
    }

    const rawData = await handler(params);
    const transformExpression = compileView(viewDef);
    const transformedData = await transform(transformExpression, rawData);

    return {
        status: "ok",
        data: transformedData,
        audit: buildAuditEntry(toolName, access, "ok", viewName, participantCount)
    };
}
