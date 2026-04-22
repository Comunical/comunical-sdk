import { describe, it, expect } from "vitest";
import { compileMatchSugar } from "../../src/match/SugarCompiler";

describe("SugarCompiler", () => {
    it("compiles a single key-value pair to a JSONata equality expression", () => {
        const result = compileMatchSugar({ tool: "calendar" });
        expect(result).toBe('tool = "calendar"');
    });

    it("compiles multiple key-value pairs joined with 'and'", () => {
        const result = compileMatchSugar({ tool: "execute_tool", "params.provider": "google_calendar" });
        expect(result).toBe('tool = "execute_tool" and params.provider = "google_calendar"');
    });

    it("compiles dotted keys without quoting the path", () => {
        const result = compileMatchSugar({ "params.action.type": "read" });
        expect(result).toBe('params.action.type = "read"');
    });

    it("handles a single entry with a dotted key", () => {
        const result = compileMatchSugar({ "params.provider": "gmail" });
        expect(result).toBe('params.provider = "gmail"');
    });

    it("compiles three key-value pairs correctly", () => {
        const result = compileMatchSugar({ tool: "execute_tool", "params.provider": "google", "params.action": "list" });
        expect(result).toBe('tool = "execute_tool" and params.provider = "google" and params.action = "list"');
    });

    it("escapes double quotes in values", () => {
        const result = compileMatchSugar({ tool: 'say "hello"' });
        expect(result).toBe('tool = "say \\"hello\\""');
    });

    it("throws on an empty object", () => {
        expect(() => compileMatchSugar({})).toThrow();
    });
});
