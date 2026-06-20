import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateExcel } from "@/lib/exportUtils";
import { isManager, isAccountant } from "@/lib/rbac";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(session) && !isAccountant(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  try {
    const { title, columns, data } = await req.json();
    const buffer = await generateExcel(title || 'Export', columns || [], data || []);
    
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="${title || 'Export'}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    });
  } catch (err) {
    console.error("Excel Export Error:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}