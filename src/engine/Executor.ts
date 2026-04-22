import type { ExecuteResult, ToolHandler, GuardConfig, ConversationContext } from "../Types";

export async function executePipeline(
    _toolName: string,
    _handler: ToolHandler,
    _params: Record<string, unknown>,
    _guardConfig: GuardConfig,
    _context: ConversationContext
): Promise<ExecuteResult> {
    throw new Error("not implemented");
}
