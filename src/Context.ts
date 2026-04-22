import { ConversationContextSchema } from "./Types";
import type { GuardConfig, ConversationContext, ExecuteResult, ToolHandler } from "./Types";
import { InvalidConfigError } from "./Errors";
import { executePipeline } from "./engine/Executor";
import { createAuditLogger } from "./audit/Logger";
import type { AuditEntry } from "./audit/Logger";

export class BoundContext {
    public readonly context: ConversationContext;
    private readonly auditLogger;

    constructor(
        private readonly guardConfig: GuardConfig,
        contextInput: unknown
    ) {
        const parseResult = ConversationContextSchema.safeParse(contextInput);
        if (!parseResult.success) {
            throw new InvalidConfigError(parseResult.error.message);
        }
        this.context = parseResult.data;
        this.auditLogger = createAuditLogger();
    }

    async execute(toolName: string, handler: ToolHandler, params: Record<string, unknown>): Promise<ExecuteResult> {
        const pipelineResult = await executePipeline(toolName, handler, params, this.guardConfig, this.context);
        this.auditLogger.log(pipelineResult.audit);
        const { status, data, reason } = pipelineResult;
        return { status, data, reason };
    }

    getAuditLog(): AuditEntry[] {
        return this.auditLogger.getEntries();
    }
}
