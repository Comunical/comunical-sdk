import { InvalidConfigError } from "../Errors";

export type DeclarativeView = {
    include?: string[];
    replace?: Record<string, string>;
    compute?: Record<string, string>;
    transform?: string;
};

export type ViewDefinition = "*" | "deny" | DeclarativeView;

function extractPrefix(fields: string[]): { prefix: string; localFields: string[] } {
    if (fields.length === 0) {
        return { prefix: "", localFields: [] };
    }

    const firstDot = fields[0].indexOf(".");
    if (firstDot === -1) {
        return { prefix: "", localFields: fields };
    }

    const prefix = fields[0].substring(0, firstDot);
    const allSharePrefix = fields.every(f => f.startsWith(prefix + "."));

    if (!allSharePrefix) {
        return { prefix: "", localFields: fields };
    }

    return {
        prefix,
        localFields: fields.map(f => f.substring(firstDot + 1))
    };
}

function stripPrefix(field: string, prefix: string): string {
    if (prefix && field.startsWith(prefix + ".")) {
        return field.substring(prefix.length + 1);
    }
    return field;
}

function escapeJsonataString(value: string): string {
    return value.replace(/"/g, '\\"');
}

function compileComputeExpression(expr: string, prefix: string): string {
    let compiled = expr;
    if (prefix) {
        compiled = compiled.replace(new RegExp(`\\b${prefix}\\.`, "g"), "");
    }
    return compiled
        .replace(/\bcount\(/g, "$count(")
        .replace(/\bsum\(/g, "$sum(")
        .replace(/\bstring\(/g, "$string(")
        .replace(/\bnumber\(/g, "$number(");
}

function compileDeclarativeView(view: DeclarativeView): string {
    if (view.transform) {
        return view.transform;
    }

    const includeFields = view.include ?? [];
    if (includeFields.length === 0 && !view.replace && !view.compute) {
        throw new InvalidConfigError("Declarative view must have at least one of: include, replace, or compute");
    }

    if (includeFields.length === 0) {
        throw new InvalidConfigError("Declarative view must have an include array with at least one field");
    }

    const allFields = [...includeFields, ...Object.keys(view.replace ?? {}), ...Object.keys(view.compute ?? {})];

    const { prefix } = extractPrefix(allFields);

    const projectionParts: string[] = [];

    for (const field of includeFields) {
        const local = stripPrefix(field, prefix);
        projectionParts.push(`"${local}": ${local}`);
    }

    if (view.replace) {
        for (const [field, value] of Object.entries(view.replace)) {
            const local = stripPrefix(field, prefix);
            projectionParts.push(`"${local}": "${escapeJsonataString(value)}"`);
        }
    }

    if (view.compute) {
        for (const [field, expr] of Object.entries(view.compute)) {
            const local = stripPrefix(field, prefix);
            const compiledExpr = compileComputeExpression(expr, prefix);
            projectionParts.push(`"${local}": ${compiledExpr}`);
        }
    }

    const projection = `{ ${projectionParts.join(", ")} }`;

    if (prefix) {
        return `${prefix}.${projection}`;
    }
    return projection;
}

export function compileView(view: ViewDefinition): string {
    if (view === "*") {
        return "$$";
    }

    if (view === "deny") {
        return '{ "status": "access_denied", "reason": "insufficient_trust_level" }';
    }

    return compileDeclarativeView(view);
}
