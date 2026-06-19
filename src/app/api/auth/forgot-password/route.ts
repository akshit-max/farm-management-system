import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return 200 even if user not found to prevent email enumeration
      return NextResponse.json({ message: "Reset instructions sent if email exists" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    await db.user.update({
      where: { id: user.id },
      data: {
        reset_token: resetToken,
        reset_token_expiry: resetTokenExpiry,
      },
    });

    // In a real application, you would send an email here with a link:
    // http://localhost:3000/reset-password?token=${resetToken}
    
    // For now, since we don't have an SMTP server configured, we will return the token in development mode
    // or just simulate it.
    console.log(`Password reset token for ${email}: ${resetToken}`);

    return NextResponse.json({ 
      message: "Reset instructions sent if email exists",
      // Only returning this for demo/testing purposes
      _devToken: resetToken 
    });

  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
