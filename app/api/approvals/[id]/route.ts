import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import { getTokenUser } from "@/lib/auth";
import User from "@/models/User";
import Expense from "@/models/Expenses";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();

        const { id } = await params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid expense id" }, { status: 400 });
        }

        const tokenUser = getTokenUser(req);
        if (!tokenUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        if (!["admin", "finance"].includes(tokenUser.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const dbUser = await User.findById(tokenUser.userId);
        if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const status = body.status as "approved" | "rejected";

        if (!["approved", "rejected"].includes(status)) {
            return NextResponse.json({ error: "status must be approved or rejected" }, { status: 400 });
        }

        const expense = await Expense.findById(id);
        if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

        // finance can only approve inside their department
        // if (dbUser.role === "finance") {
        //     if (!dbUser.department_id) {
        //         return NextResponse.json({ error: "Finance has no department assigned" }, { status: 400 });
        //     }
        //     if (String(expense.department) !== String(dbUser.department_id)) {
        //         return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        //     }
        // }

        // Only pending can be approved/rejected
        if (expense.status !== "pending") {
            return NextResponse.json({ error: "Expense already processed" }, { status: 400 });
        }

        expense.status = status;
        expense.approvedBy = dbUser._id;
        expense.approvedAt = new Date();
        await expense.save();

        const updated = await Expense.findById(id).populate("department", "_id name").populate("category", "_id name").populate("createdBy", "_id username email").populate("approvedBy", "_id username email");

        return NextResponse.json({ success: true, expense: updated });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
