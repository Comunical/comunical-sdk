import { GuardConfigSchema } from "./Types";
import type { GuardConfig, ConversationContext, LlmCallback } from "./Types";
import { BoundContext } from "./Context";
import { InvalidConfigError } from "./Errors";

export interface GuardOptions {
    llm?: LlmCallback;
}

export interface Guard {
    readonly config: GuardConfig;
    withContext(contextInput: unknown): BoundContext;
}

export function createGuard(configInput: unknown, options?: GuardOptions): Guard {
    const parseResult = GuardConfigSchema.safeParse(configInput);
    if (!parseResult.success) {
        throw new InvalidConfigError(parseResult.error.message);
    }

    const config = parseResult.data;
    const llm = options?.llm;

    const hasImplicitTool = Object.values(config.tools).some(t => t.access === "implicit");
    if (hasImplicitTool && !llm) {
        throw new InvalidConfigError('Tools with access "implicit" require an llm callback. Pass { llm: async (prompt) => ... } as the second argument to createGuard.');
    }

    return {
        config,
        withContext(contextInput: unknown): BoundContext {
            return new BoundContext(config, contextInput as ConversationContext, llm);
        }
    };
}
