import { createGuard } from "./Guard";
import * as builtins from "./builtins";

export const comunical = {
    createGuard,
    builtins
};

export { createGuard } from "./Guard";
export type { Guard } from "./Guard";
export { BoundContext } from "./Context";
export { compileView } from "./views/ViewCompiler";

export type {
    TrustTier,
    ToolAccess,
    IdentityVerification,
    ContextType,
    ParticipantRole,
    ExecuteStatus,
    ToolConfig,
    Participant,
    MessageEnvelope,
    DeclarativeView,
    ViewDefinition,
    Alias,
    RuleConfig,
    GuardConfig,
    ConversationContext,
    ExecuteResult,
    ToolHandler
} from "./Types";

export {
    TrustTierSchema,
    ToolAccessSchema,
    IdentityVerificationSchema,
    ContextTypeSchema,
    ParticipantRoleSchema,
    ExecuteStatusSchema,
    ToolConfigSchema,
    ParticipantSchema,
    MessageEnvelopeSchema,
    DeclarativeViewSchema,
    ViewDefinitionSchema,
    AliasSchema,
    RuleConfigSchema,
    GuardConfigSchema,
    ConversationContextSchema,
    ExecuteResultSchema
} from "./Types";

export { ComunicalError, GrantDeniedError, NoMatchingRuleError, TransformationError, InvalidConfigError } from "./Errors";

export type { AuditEntry } from "./audit/Logger";
