import { ConversationContextSchema } from "./Types";
import type { GuardConfig, ConversationContext, ExecuteResult, ToolHandler } from "./Types";
import { InvalidConfigError } from "./Errors";
import { executePipeline } from "./engine/Executor";

export class BoundContext {
    public readonly context: ConversationContext;

    constructor(
        private readonly guardConfig: GuardConfig,
        contextInput: unknown
    ) {
        const parseResult = ConversationContextSchema.safeParse(contextInput);
        if (!parseResult.success) {
            throw new InvalidConfigError(parseResult.error.message);
        }
        this.context = parseResult.data;
    }

    async execute(toolName: string, handler: ToolHandler, params: Record<string, unknown>): Promise<ExecuteResult> {
        return executePipeline(toolName, handler, params, this.guardConfig, this.context);
    }
}
