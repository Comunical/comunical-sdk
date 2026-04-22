import { describe, it, expect } from "vitest";
import { createAuditLogger } from "../../src/audit/Logger";

describe("AuditLogger", () => {
    it("creates a logger with empty entries", () => {
        const logger = createAuditLogger();
        expect(logger.getEntries()).toEqual([]);
    });

    it("logs an audit entry", () => {
        const logger = createAuditLogger();
        logger.log({
            timestamp: "2026-04-21T14:00:00Z",
            tool: "calendar",
            access: "owner_only",
            disclosure_level: "free_busy_only",
            status: "ok",
            participant_count: 2
        });
        const entries = logger.getEntries();
        expect(entries).toHaveLength(1);
        expect(entries[0].tool).toBe("calendar");
        expect(entries[0].status).toBe("ok");
    });

    it("logs multiple entries in order", () => {
        const logger = createAuditLogger();
        logger.log({
            timestamp: "2026-04-21T14:00:00Z",
            tool: "calendar",
            access: "owner_only",
            disclosure_level: "full",
            status: "ok",
            participant_count: 1
        });
        logger.log({
            timestamp: "2026-04-21T14:01:00Z",
            tool: "email",
            access: "explicit",
            disclosure_level: "metadata_only",
            status: "denied",
            participant_count: 3,
            reason: "permission_required"
        });
        const entries = logger.getEntries();
        expect(entries).toHaveLength(2);
        expect(entries[0].tool).toBe("calendar");
        expect(entries[1].tool).toBe("email");
        expect(entries[1].reason).toBe("permission_required");
    });

    it("returns a copy of entries (not a reference)", () => {
        const logger = createAuditLogger();
        logger.log({
            timestamp: "2026-04-21T14:00:00Z",
            tool: "calendar",
            access: "owner_only",
            disclosure_level: "full",
            status: "ok",
            participant_count: 1
        });
        const entries1 = logger.getEntries();
        const entries2 = logger.getEntries();
        expect(entries1).not.toBe(entries2);
        expect(entries1).toEqual(entries2);
    });
});
