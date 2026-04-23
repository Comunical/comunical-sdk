import { ConversationContextSchema } from "./Types";
import type { GuardConfig, ConversationContext, ExecuteResult, ToolHandler, ToolExecutionRequest, LlmCallback } from "./Types";
import { InvalidConfigError } from "./Errors";
import { executePipeline } from "./engine/Executor";
import { createAuditLogger } from "./audit/Logger";
import type { AuditEntry } from "./audit/Logger";

export interface ExecuteInput extends ToolExecutionRequest {
    handler: ToolHandler;
}

export class BoundContext {
    public readonly context: ConversationContext;
    private readonly auditLogger;

    constructor(
        private readonly guardConfig: GuardConfig,
        contextInput: unknown,
        private readonly llm?: LlmCallback
    ) {
        const parseResult = ConversationContextSchema.safeParse(contextInput);
        if (!parseResult.success) {
            throw new InvalidConfigError(parseResult.error.message);
        }
        this.context = parseResult.data;
        this.auditLogger = createAuditLogger();
    }

    async execute(input: ExecuteInput): Promise<ExecuteResult> {
        const { handler, ...request } = input;
        const pipelineResult = await executePipeline(request, handler, this.guardConfig, this.context, this.llm);
        this.auditLogger.log(pipelineResult.audit);
        const { status, data, reason } = pipelineResult;
        return { status, data, reason };
    }

    getAuditLog(): AuditEntry[] {
        return this.auditLogger.getEntries();
    }
}
