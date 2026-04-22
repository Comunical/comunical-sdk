import { GuardConfigSchema } from "./Types";
import type { GuardConfig, ConversationContext } from "./Types";
import { BoundContext } from "./Context";
import { InvalidConfigError } from "./Errors";

export interface Guard {
    readonly config: GuardConfig;
    withContext(contextInput: unknown): BoundContext;
}

export function createGuard(configInput: unknown): Guard {
    const parseResult = GuardConfigSchema.safeParse(configInput);
    if (!parseResult.success) {
        throw new InvalidConfigError(parseResult.error.message);
    }

    const config = parseResult.data;

    return {
        config,
        withContext(contextInput: unknown): BoundContext {
            return new BoundContext(config, contextInput as ConversationContext);
        }
    };
}
