import { db } from "./src/lib/db";

async function test() {
  const farmId = "d9b82079-3261-4c83-b30f-321903ceb57d";
  
  const recentFeeds = await db.feedType.findMany({
    where: { farm_id: farmId },
    orderBy: { created_at: "desc" },
    take: 5
  });
  console.log("Recent Feed Types:", recentFeeds);

  const recentSlaughters = await db.slaughterRecord.findMany({
    where: { farm_id: farmId },
    orderBy: { created_at: "desc" },
    take: 5
  });
  console.log("Recent Slaughters:", recentSlaughters);
}

test();
