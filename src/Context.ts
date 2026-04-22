import { ConversationContextSchema } from "./Types";
import type { GuardConfig, ConversationContext, ExecuteResult, ToolHandler } from "./Types";
import { InvalidConfigError } from "./Errors";

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

    async execute(_toolName: string, _handler: ToolHandler, _params: Record<string, unknown>): Promise<ExecuteResult> {
        void this.guardConfig;
        throw new Error("not implemented");
    }
}
