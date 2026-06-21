import { db } from "@/lib/db";
import { auth } from "@/auth";

export type AuditSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface AuditPayload {
  farmId?: string;
  userId?: string;
  role?: string;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  severity?: AuditSeverity;
  beforeSnapshot?: any;
  afterSnapshot?: any;
  reason?: string;
}

// Diff Engine
function getDiff(before: any, after: any) {
  if (!before && !after) return { beforeDiff: null, afterDiff: null, changedFields: [] };
  if (!before) return { beforeDiff: null, afterDiff: after, changedFields: Object.keys(after || {}) };
  if (!after) return { beforeDiff: before, afterDiff: null, changedFields: Object.keys(before || {}) };

  const changedFields: string[] = [];
  const beforeDiff: any = {};
  const afterDiff: any = {};

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  allKeys.delete('created_at');
  allKeys.delete('updated_at');
  allKeys.delete('last_modified');
  allKeys.delete('sync_status');

  for (const key of allKeys) {
    const valBefore = before[key];
    const valAfter = after[key];
    
    if (JSON.stringify(valBefore) !== JSON.stringify(valAfter)) {
      changedFields.push(key);
      beforeDiff[key] = valBefore;
      afterDiff[key] = valAfter;
    }
  }

  return { beforeDiff, afterDiff, changedFields };
}

export async function logAuditEvent(payload: AuditPayload, tx: any = db) {
  try {
    let { userId, role, farmId } = payload;
    if (!userId || !role) {
      try {
        const session = await auth();
        userId = userId || session?.user?.id || undefined;
        role = role || session?.user?.role || undefined;
        farmId = farmId || session?.user?.farm_id || undefined;
      } catch(e) {}
    }

    const { beforeDiff, afterDiff, changedFields } = getDiff(payload.beforeSnapshot, payload.afterSnapshot);

    await tx.auditLog.create({
      data: {
        farm_id: farmId || null,
        user_id: userId || null,
        role: role || "SYSTEM",
        module: payload.module,
        action: payload.action,
        entity_type: payload.entityType,
        entity_id: payload.entityId,
        severity: payload.severity || "INFO",
        before_snapshot: Object.keys(beforeDiff || {}).length > 0 ? JSON.stringify(beforeDiff) : "{}",
        after_snapshot: Object.keys(afterDiff || {}).length > 0 ? JSON.stringify(afterDiff) : "{}",
        changed_fields: changedFields.length > 0 ? JSON.stringify(changedFields) : "[]",
        reason: payload.reason || "Standard system event",
      }
    });
  } catch (error) {
    console.error("[AUDIT FAILURE]", error);
    // CRITICAL constraint per Phase 12 Requirement #4
    if (payload.severity === "CRITICAL") {
      throw new Error("Critical Audit Log Failed to Write");
    }
  }
}
