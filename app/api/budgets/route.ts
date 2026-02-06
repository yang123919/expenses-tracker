import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Budget from "@/models/Budget";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(req: NextRequest) {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("department");
    const month = searchParams.get("month");

    if (!departmentId || !month) {
        return NextResponse.json(null);
    }

    const budget = await Budget.findOne({ departmentId, month });

    return NextResponse.json(budget); // ✅ null is OK
}

export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        // 🔐 Auth
        const token = req.cookies.get("token")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const decoded = jwt.verify(token, JWT_SECRET) as {
            role: "admin" | "finance" | "operator";
        };

        // ❌ Only finance/admin can set budgets
        if (!["admin", "finance"].includes(decoded.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { departmentId, month, amount } = await req.json();

        if (!departmentId || !month || amount == null) {
            return NextResponse.json({ error: "All fields required" }, { status: 400 });
        }

        // Unique index already prevents duplicates
        const budget = await Budget.create({
            departmentId,
            month,
            amount,
        });

        return NextResponse.json({ success: true, budget });
    } catch (err: any) {
        if (err.code === 11000) {
            return NextResponse.json({ error: "Budget already exists for this department and month" }, { status: 400 });
        }

        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

