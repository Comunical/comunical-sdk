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

export const DisclosureLevelConfigSchema = z.object({
    transform: z.string().min(1)
});
export type DisclosureLevelConfig = z.infer<typeof DisclosureLevelConfigSchema>;

export const PolicyRuleSchema = z.object({
    name: z.string().min(1),
    match: z.union([z.string().min(1), z.record(z.string(), z.string())]),
    disclosure: z.record(TrustTierSchema, z.string()),
    disclosure_levels: z.record(z.string(), DisclosureLevelConfigSchema).optional()
});
export type PolicyRule = z.infer<typeof PolicyRuleSchema>;

export const GuardConfigSchema = z.object({
    default_access: ToolAccessSchema.default("owner_only"),
    tools: z.record(z.string(), ToolConfigSchema),
    policies: z.object({
        rules: z.array(PolicyRuleSchema)
    })
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

// --- Functional types (not expressible in Zod) ---

export type ToolHandler<T = unknown> = (params: Record<string, unknown>) => Promise<T>;
