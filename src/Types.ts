import { z } from "zod";

// --- Primitives ---

export const TrustTierSchema = z.enum(["owner", "verified", "guest", "external"]);
export type TrustTier = z.infer<typeof TrustTierSchema>;

export const ToolAccessSchema = z.enum(["open", "owner_only", "explicit", "implicit"]);
export type ToolAccess = z.infer<typeof ToolAccessSchema>;

export const IdentityVerificationSchema = z.enum(["verified", "assumed", "unverified"]);
export type IdentityVerification = z.infer<typeof IdentityVerificationSchema>;

export const ContextTypeSchema = z.enum(["direct", "group"]);
export type ContextType = z.infer<typeof ContextTypeSchema>;

export const ParticipantRoleSchema = z.enum(["human", "agent"]);
export type ParticipantRole = z.infer<typeof ParticipantRoleSchema>;

export const ExecuteStatusSchema = z.enum(["ok", "permission_required", "denied"]);
export type ExecuteStatus = z.infer<typeof ExecuteStatusSchema>;

// --- Composites ---

export const ToolConfigSchema = z.object({
    access: ToolAccessSchema.optional()
});
export type ToolConfig = z.infer<typeof ToolConfigSchema>;

export const ParticipantSchema = z.object({
    role: ParticipantRoleSchema,
    trust: TrustTierSchema,
    identity_verification: IdentityVerificationSchema.optional()
});
export type Participant = z.infer<typeof ParticipantSchema>;

export const MessageEnvelopeSchema = z.object({
    from: z.string().min(1),
    to: z.array(z.string().min(1)).min(1),
    cc: z.array(z.string().min(1)).optional(),
    body: z.string(),
    timestamp: z.string().min(1)
});
export type MessageEnvelope = z.infer<typeof MessageEnvelopeSchema>;

// --- Rules: ACL + Views ---

export const DeclarativeViewSchema = z.object({
    include: z.array(z.string().min(1)).optional(),
    replace: z.record(z.string(), z.string()).optional(),
    compute: z.record(z.string(), z.string()).optional(),
    transform: z.string().min(1).optional()
});
export type DeclarativeView = z.infer<typeof DeclarativeViewSchema>;

export const ViewDefinitionSchema = z.union([z.literal("*"), z.literal("deny"), DeclarativeViewSchema]);
export type ViewDefinition = z.infer<typeof ViewDefinitionSchema>;

export const AliasSchema = z.object({
    tool: z.string().min(1),
    provider: z.string().min(1)
});
export type Alias = z.infer<typeof AliasSchema>;

export const RuleConfigSchema = z.object({
    aliases: z.array(AliasSchema).optional(),
    acl: z.record(TrustTierSchema, z.string()),
    views: z.record(z.string(), ViewDefinitionSchema)
});
export type RuleConfig = z.infer<typeof RuleConfigSchema>;

// --- Guard config ---

export const GuardConfigSchema = z.object({
    default_access: ToolAccessSchema.default("owner_only"),
    tools: z.record(z.string(), ToolConfigSchema),
    rules: z.record(z.string(), RuleConfigSchema)
});
export type GuardConfig = z.infer<typeof GuardConfigSchema>;

export const ConversationContextSchema = z.object({
    context_type: ContextTypeSchema.default("group"),
    identity_verification: IdentityVerificationSchema.default("unverified"),
    participants: z.record(z.string(), ParticipantSchema),
    messages: z.array(MessageEnvelopeSchema).min(1)
});
export type ConversationContext = z.infer<typeof ConversationContextSchema>;

export const ExecuteResultSchema = z.object({
    status: ExecuteStatusSchema,
    data: z.unknown().optional(),
    reason: z.string().optional()
});
export type ExecuteResult = z.infer<typeof ExecuteResultSchema>;

// --- Tool execution request ---

export const ToolExecutionRequestSchema = z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    parameters: z.unknown().optional(),
    params: z.record(z.string(), z.unknown()).default({})
});
export type ToolExecutionRequest = z.infer<typeof ToolExecutionRequestSchema>;

// --- Functional types (not expressible in Zod) ---

export type ToolHandler<T = unknown> = (params: Record<string, unknown>) => Promise<T>;

export type LlmCallback = (prompt: string) => Promise<string>;
