import { db } from "@/lib/db";

export async function logAudit(
  userId: string | null | undefined,
  farmId: string | null | undefined,
  action: string,
  entity: string,
  entityId: string
) {
  try {
    await db.auditLog.create({
      data: {
        user_id: userId || null,
        farm_id: farmId || null,
        action,
        entity,
        entity_id: entityId,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
