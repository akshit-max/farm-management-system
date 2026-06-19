import { NextResponse } from "next/dist/server/web/spec-extension/response";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const signupSchema = z.object({
  farmName: z.string().min(2, "Farm name must be at least 2 characters"),
  ownerName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = signupSchema.parse(body);

    const existingUser = await db.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    // Get the OWNER role
    const ownerRole = await db.role.findUnique({
      where: { name: "Owner" },
    });

    if (!ownerRole) {
      return NextResponse.json({ error: "System roles not initialized" }, { status: 500 });
    }

    // Create Farm and User in a transaction
    const result = await db.$transaction(async (tx) => {
      const farm = await tx.farm.create({
        data: {
          name: data.farmName,
        },
      });

      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await tx.user.create({
        data: {
          name: data.ownerName,
          email: data.email,
          password_hash: hashedPassword,
          role_id: ownerRole.id,
          farm_id: farm.id,
        },
      });

      // Initialize default settings for the farm
      await tx.settings.create({
        data: {
          farm_id: farm.id,
          theme: "light",
          currency: "USD",
          date_format: "YYYY-MM-DD",
        },
      });

      return { user, farm };
    });

    return NextResponse.json({ message: "Account created successfully", data: { email: result.user.email } }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
