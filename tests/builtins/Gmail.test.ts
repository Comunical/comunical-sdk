import { describe, it, expect } from "vitest";
import { gmail } from "../../src/builtins/Gmail";
import { matchRule } from "../../src/engine/RuleMatcher";
import { transform } from "../../src/engine/Transformer";

const gmailApiResponse = {
    messages: [
        {
            id: "msg1",
            payload: {
                headers: [
                    { name: "From", value: "alice@acme.com" },
                    { name: "Subject", value: "Q4 Revenue Report" },
                    { name: "Date", value: "2026-04-20T09:00:00Z" }
                ],
                parts: [{ filename: "report.pdf" }, { filename: "" }]
            },
            body: "Here's the Q4 revenue report with confidential figures...",
            labelIds: ["INBOX", "UNREAD"]
        },
        {
            id: "msg2",
            payload: {
                headers: [
                    { name: "From", value: "bob@acme.com" },
                    { name: "Subject", value: "Team Lunch" },
                    { name: "Date", value: "2026-04-20T12:00:00Z" }
                ],
                parts: []
            },
            body: "Want to grab lunch today?",
            labelIds: ["INBOX"]
        }
    ]
};

describe("Gmail builtin", () => {
    it("matches tool = 'email'", async () => {
        const result = await matchRule({ tool: "email", params: {} }, [gmail]);
        expect(result).toBe(gmail);
    });

    it("matches composio-style execute_tool with gmail provider", async () => {
        const result = await matchRule({ tool: "execute_tool", params: { provider: "gmail" } }, [gmail]);
        expect(result).toBe(gmail);
    });

    it("does not match unrelated tools", async () => {
        const result = await matchRule({ tool: "calendar", params: {} }, [gmail]);
        expect(result).toBeNull();
    });

    it("metadata_only transform extracts headers without body", async () => {
        const expr = gmail.disclosure_levels!["metadata_only"].transform;
        const result = await transform(expr, gmailApiResponse);
        const messages = result as Array<Record<string, unknown>>;
        expect(messages).toHaveLength(2);
        expect(messages[0]).toEqual({
            from: "alice@acme.com",
            subject: "Q4 Revenue Report",
            date: "2026-04-20T09:00:00Z",
            has_attachments: true
        });
        expect(messages[0]).not.toHaveProperty("body");
        expect(messages[1]).toHaveProperty("has_attachments", false);
    });

    it("none transform returns access denied message", async () => {
        const expr = gmail.disclosure_levels!["none"].transform;
        const result = await transform(expr, gmailApiResponse);
        expect(result).toEqual({ status: "access_denied", reason: "insufficient_trust_level" });
    });

    it("full transform passes through everything", async () => {
        const expr = gmail.disclosure_levels!["full"].transform;
        const result = await transform(expr, gmailApiResponse);
        expect(result).toEqual(gmailApiResponse);
    });

    it("has correct disclosure mappings for trust tiers", () => {
        expect(gmail.disclosure.owner).toBe("full");
        expect(gmail.disclosure.verified).toBe("metadata_only");
        expect(gmail.disclosure.guest).toBe("metadata_only");
        expect(gmail.disclosure.external).toBe("none");
    });
});
