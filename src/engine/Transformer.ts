import jsonata from "jsonata";
import { TransformationError } from "../Errors";

function normalizeResult(value: unknown): unknown {
    if (Array.isArray(value)) {
        return Array.from(value, normalizeResult);
    }
    if (value !== null && typeof value === "object") {
        const normalized: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
            normalized[key] = normalizeResult(val);
        }
        return normalized;
    }
    return value;
}

export async function transform(expression: string, data: unknown): Promise<unknown> {
    try {
        const compiled = jsonata(expression);
        const result = await compiled.evaluate(data);
        return normalizeResult(result);
    } catch (error) {
        throw new TransformationError("unknown", expression, error instanceof Error ? error : new Error(String(error)));
    }
}
