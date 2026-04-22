import { describe, it, expect } from "vitest";
import { gmail } from "../../src/builtins/Gmail";
import { compileView } from "../../src/views/ViewCompiler";
import { transform } from "../../src/engine/Transformer";

const gmailApiResponse = {
    messages: [
        {
            from: "alice@acme.com",
            subject: "Q4 Revenue Report",
            date: "2026-04-20T09:00:00Z",
            attachments: [{ name: "report.pdf" }],
            body: "Here's the Q4 revenue report with confidential figures...",
            labelIds: ["INBOX", "UNREAD"]
        },
        {
            from: "bob@acme.com",
            subject: "Team Lunch",
            date: "2026-04-20T12:00:00Z",
            attachments: [],
            body: "Want to grab lunch today?",
            labelIds: ["INBOX"]
        }
    ]
};

describe("Gmail builtin", () => {
    it("has correct ACL mappings for all trust tiers", () => {
        expect(gmail.acl.owner).toBe("full");
        expect(gmail.acl.verified).toBe("headers");
        expect(gmail.acl.guest).toBe("headers");
        expect(gmail.acl.external).toBe("deny");
    });

    it("headers view extracts metadata without body", async () => {
        const expr = compileView(gmail.views.headers);
        const result = await transform(expr, gmailApiResponse);
        const messages = result as Array<Record<string, unknown>>;
        expect(messages).toHaveLength(2);
        expect(messages[0]).toEqual({
            from: "alice@acme.com",
            subject: "Q4 Revenue Report",
            date: "2026-04-20T09:00:00Z",
            has_attachments: true
        });
        expect(messages[1].has_attachments).toBe(false);
        expect(messages[0]).not.toHaveProperty("body");
    });

    it("deny view returns access denied message", async () => {
        const expr = compileView(gmail.views.deny);
        const result = await transform(expr, gmailApiResponse);
        expect(result).toEqual({ status: "access_denied", reason: "insufficient_trust_level" });
    });

    it("full view passes through everything", async () => {
        const expr = compileView(gmail.views.full);
        const result = await transform(expr, gmailApiResponse);
        expect(result).toEqual(gmailApiResponse);
    });

    it("has aliases for composio-style execute_tool", () => {
        expect(gmail.aliases).toEqual([{ tool: "execute_tool", provider: "gmail" }]);
    });
});
