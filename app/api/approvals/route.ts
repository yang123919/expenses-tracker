import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import { getTokenUser } from "@/lib/auth";
import User from "@/models/User";
import Expense from "@/models/Expenses";

export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const tokenUser = getTokenUser(req);
        if (!tokenUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        if (!["admin", "finance"].includes(tokenUser.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const dbUser = await User.findById(tokenUser.userId);
        if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);
        const departmentQuery = searchParams.get("department"); // now finance can use too

        const match: any = { status: "pending", month };

        // ✅ If department filter exists (admin OR finance), apply it
        if (departmentQuery) {
            if (!mongoose.Types.ObjectId.isValid(departmentQuery)) {
                return NextResponse.json({ error: "Invalid department id" }, { status: 400 });
            }
            match.department = departmentQuery;
        }

        const expenses = await Expense.find(match).populate("department", "_id name").populate("category", "_id name").populate("createdBy", "_id username email").sort({ createdAt: -1 });

        return NextResponse.json(expenses);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
