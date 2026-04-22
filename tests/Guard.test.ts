import { describe, it, expect } from "vitest";
import { createGuard } from "../src/Guard";
import { InvalidConfigError } from "../src/Errors";

describe("createGuard", () => {
    it("creates a guard with valid config", () => {
        const guard = createGuard({
            tools: {
                search: { access: "open" },
                calendar: {}
            },
            rules: {
                calendar: {
                    acl: { owner: "full", verified: "full", guest: "full", external: "full" },
                    views: { full: "*" }
                }
            }
        });

        expect(guard.config.default_access).toBe("owner_only");
        expect(guard.config.tools.search.access).toBe("open");
        expect(guard.config.tools.calendar.access).toBeUndefined();
    });

    it("applies default_access when not specified", () => {
        const guard = createGuard({
            tools: { calendar: {} },
            rules: {}
        });
        expect(guard.config.default_access).toBe("owner_only");
    });

    it("allows overriding default_access", () => {
        const guard = createGuard({
            default_access: "explicit",
            tools: { calendar: {} },
            rules: {}
        });
        expect(guard.config.default_access).toBe("explicit");
    });

    it("throws InvalidConfigError for missing tools", () => {
        expect(() => createGuard({ rules: {} })).toThrow(InvalidConfigError);
    });

    it("throws InvalidConfigError for invalid access mode", () => {
        expect(() =>
            createGuard({
                tools: { calendar: { access: "invalid_mode" } },
                rules: {}
            })
        ).toThrow(InvalidConfigError);
    });

    it("returns a guard with withContext method", () => {
        const guard = createGuard({
            tools: { calendar: {} },
            rules: {}
        });
        expect(typeof guard.withContext).toBe("function");
    });

    it("withContext creates a BoundContext with validated context", () => {
        const guard = createGuard({
            tools: { calendar: {} },
            rules: {}
        });

        const context = guard.withContext({
            participants: {
                "jim@acme.com": { role: "human", trust: "owner" }
            },
            messages: [{ from: "jim@acme.com", to: ["alex@agent"], body: "Hello", timestamp: "2026-04-21T14:00:00Z" }]
        });

        expect(context.context.context_type).toBe("group");
        expect(context.context.identity_verification).toBe("unverified");
    });

    it("withContext throws for invalid participant (missing role)", () => {
        const guard = createGuard({
            tools: { calendar: {} },
            rules: {}
        });

        expect(() =>
            guard.withContext({
                participants: {
                    "jim@acme.com": { trust: "owner" }
                },
                messages: [{ from: "jim@acme.com", to: ["alex@agent"], body: "Hello", timestamp: "2026-04-21T14:00:00Z" }]
            })
        ).toThrow(InvalidConfigError);
    });

    it("withContext throws for missing messages", () => {
        const guard = createGuard({
            tools: { calendar: {} },
            rules: {}
        });

        expect(() =>
            guard.withContext({
                participants: {
                    "jim@acme.com": { role: "human", trust: "owner" }
                },
                messages: []
            })
        ).toThrow(InvalidConfigError);
    });
});
