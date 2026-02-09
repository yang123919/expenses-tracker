import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Budget from "@/models/Budget";
import jwt from "jsonwebtoken";
import { getTokenUser } from "@/lib/auth";
import mongoose from "mongoose";

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

    return NextResponse.json(budget); 
}


export async function PATCH(req: NextRequest) {
    try {
        await dbConnect();

        const token = req.cookies.get("token")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const decoded = jwt.verify(token, JWT_SECRET) as { role: "admin" | "finance" | "operator" };

        if (!["admin", "finance"].includes(decoded.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { departmentId, month, amount } = await req.json();

        if (!departmentId || !month || amount == null) {
            return NextResponse.json({ error: "All fields required" }, { status: 400 });
        }

        const amountNum = Number(amount);
        if (!Number.isFinite(amountNum) || amountNum < 0) {
            return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }

        const budget = await Budget.findOneAndUpdate({ departmentId, month }, { $set: { amount: amountNum } }, { new: true, upsert: true });

        return NextResponse.json({ success: true, budget });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
