export interface AuditEntry {
    timestamp: string;
    tool: string;
    access: string;
    disclosure_level: string;
    status: string;
    participant_count: number;
    reason?: string;
}

export function createAuditLogger(): { log: (entry: AuditEntry) => void; getEntries: () => AuditEntry[] } {
    const entries: AuditEntry[] = [];

    return {
        log(entry: AuditEntry): void {
            entries.push(entry);
        },
        getEntries(): AuditEntry[] {
            return [...entries];
        }
    };
}
