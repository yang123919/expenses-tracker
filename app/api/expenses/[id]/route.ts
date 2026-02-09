import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import Expense from "@/models/Expenses";
import Budget from "@/models/Budget";
import { getTokenUser } from "@/lib/auth";
import mongoose from "mongoose";

/* ---------------------------- PATCH: edit amount --------------------------- */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        await dbConnect();

        const { id } = await params; // ✅ unwrap
        const expenseId = id;

        const tokenUser = getTokenUser(req);
        if (!tokenUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const dbUser = await User.findById(tokenUser.userId);
        if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        if (!mongoose.Types.ObjectId.isValid(expenseId)) {
            return NextResponse.json({ error: "Invalid expense id" }, { status: 400 });
        }

        const expense = await Expense.findById(expenseId);
        if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

        // ✅ Permission
        if (dbUser.role === "operator") {
            if (!dbUser.department_id) return NextResponse.json({ error: "No department assigned" }, { status: 400 });

            const sameDept = String(expense.department) === String(dbUser.department_id);
            const isCreator = String(expense.createdBy) === String(dbUser._id);
            const isPending = expense.status === "pending";

            if (!sameDept) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            if (!isCreator) return NextResponse.json({ error: "You can only edit your own expense" }, { status: 403 });
            if (!isPending) return NextResponse.json({ error: "Only pending expenses can be edited" }, { status: 403 });
        } else if (!["admin", "finance"].includes(dbUser.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const amountNum = Number(body?.amount);

        if (!Number.isFinite(amountNum) || amountNum <= 0) {
            return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }

        // ✅ Budget check (exclude current expense from used)
        const budget = await Budget.findOne({
            departmentId: expense.department, // ✅ BudgetSchema uses departmentId
            month: expense.month,
        });

        if (!budget) {
            return NextResponse.json({ error: "No budget set for this department this month" }, { status: 403 });
        }

        const used = await Expense.aggregate([
            {
                $match: {
                    department: expense.department,
                    month: expense.month,
                    status: { $ne: "rejected" },
                    _id: { $ne: new mongoose.Types.ObjectId(expenseId) },
                },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);

        const totalUsed = used[0]?.total ?? 0;
        const remaining = budget.amount - totalUsed;

        if (amountNum > remaining) {
            return NextResponse.json({ error: `Budget exceeded. Remaining: ${remaining}` }, { status: 403 });
        }

        expense.amount = amountNum;
        await expense.save();

        const updated = await Expense.findById(expenseId).populate("category", "_id name").populate("createdBy", "_id username").populate("approvedBy", "_id username");

        return NextResponse.json({ success: true, expense: updated });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

/* ---------------------------- DELETE: delete expense --------------------------- */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        await dbConnect();

        const { id } = await params; // ✅ unwrap
        const expenseId = id;

        const tokenUser = getTokenUser(req);
        if (!tokenUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const dbUser = await User.findById(tokenUser.userId);
        if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        if (!mongoose.Types.ObjectId.isValid(expenseId)) {
            return NextResponse.json({ error: "Invalid expense id" }, { status: 400 });
        }
        const expense = await Expense.findById(expenseId);
        if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

        // ✅ Permission
        if (dbUser.role === "operator") {
            if (!dbUser.department_id) return NextResponse.json({ error: "No department assigned" }, { status: 400 });

            const sameDept = String(expense.department) === String(dbUser.department_id);
            const isCreator = String(expense.createdBy) === String(dbUser._id);
            const isPending = expense.status === "pending";

            if (!sameDept) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            if (!isCreator) return NextResponse.json({ error: "You can only delete your own expense" }, { status: 403 });
            if (!isPending) return NextResponse.json({ error: "Only pending expenses can be deleted" }, { status: 403 });
        } else if (!["admin", "finance"].includes(dbUser.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await Expense.findByIdAndDelete(expenseId);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
