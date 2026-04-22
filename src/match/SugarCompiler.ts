import { InvalidConfigError } from "../Errors";

export function compileMatchSugar(matchObject: Record<string, string>): string {
    const entries = Object.entries(matchObject);

    if (entries.length === 0) {
        throw new InvalidConfigError("Match object must have at least one key-value pair");
    }

    return entries
        .map(([key, value]) => {
            const escapedValue = value.replace(/"/g, '\\"');
            return `${key} = "${escapedValue}"`;
        })
        .join(" and ");
}
