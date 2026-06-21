import { db } from "@/lib/db";
import { logAuditEvent } from "./auditLogger";

export async function logAudit(
  userId: string | null | undefined,
  farmId: string | null | undefined,
  action: string,
  entity: string,
  entityId: string
) {
  try {
    await logAuditEvent({
      userId: userId || undefined,
      farmId: farmId || undefined,
      module: "SYSTEM",
      action,
      entityType: entity,
      entityId,
      severity: "INFO"
    });
  } catch (error) {
    console.error("Failed to write legacy audit log:", error);
  }
}
