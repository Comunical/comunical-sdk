export class ComunicalError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ComunicalError";
    }
}

export class GrantDeniedError extends ComunicalError {
    constructor(
        public readonly tool: string,
        public readonly reason: string
    ) {
        super(`Grant denied for tool "${tool}": ${reason}`);
        this.name = "GrantDeniedError";
    }
}

export class NoMatchingRuleError extends ComunicalError {
    constructor(public readonly tool: string) {
        super(`No matching policy rule for tool "${tool}"`);
        this.name = "NoMatchingRuleError";
    }
}

export class TransformationError extends ComunicalError {
    constructor(
        public readonly tool: string,
        public readonly expression: string,
        cause?: Error
    ) {
        super(`Transformation failed for tool "${tool}": ${cause?.message ?? "unknown error"}`);
        this.name = "TransformationError";
        this.cause = cause;
    }
}

export class InvalidConfigError extends ComunicalError {
    constructor(message: string) {
        super(`Invalid configuration: ${message}`);
        this.name = "InvalidConfigError";
    }
}
