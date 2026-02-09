import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import Expense from "@/models/Expenses";
import Budget from "@/models/Budget";
import Category from "@/models/Category";
import { getTokenUser } from "@/lib/auth";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        const tokenUser = getTokenUser(req);
        if (!tokenUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const dbUser = await User.findById(tokenUser.userId);
        if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { title, amount, categoryId, month } = await req.json();

        if (!title || !amount || !categoryId || !month) {
            return NextResponse.json({ error: "All fields required" }, { status: 400 });
        }

        const amountNum = Number(amount);
        if (!Number.isFinite(amountNum) || amountNum <= 0) {
            return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }

        // Operator must have department
        if (dbUser.role === "operator" && !dbUser.department_id) {
            return NextResponse.json({ error: "No department assigned" }, { status: 400 });
        }

        const departmentId = dbUser.department_id;
        if (!departmentId) return NextResponse.json({ error: "Missing department" }, { status: 400 });

        // Validate categoryId format
        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
        }

        // Category must belong to this department
        const cat = await Category.findOne({ _id: categoryId, department: departmentId });
        if (!cat) {
            return NextResponse.json({ error: "Category not in your department" }, { status: 403 });
        }

        // Budget must exist for this month
        const budget = await Budget.findOne({ departmentId, month });
        if (!budget) {
            return NextResponse.json({ error: "No budget set for this department this month" }, { status: 403 });
        }

        const used = await Expense.aggregate([{ $match: { department: departmentId, month, status: { $ne: "rejected" } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);

        const totalUsed = used[0]?.total ?? 0;
        const remaining = budget.amount - totalUsed;
        if (amountNum > remaining) {
            return NextResponse.json({ error: `Budget exceeded. Remaining: ${remaining}` }, { status: 403 });
        }

        const expense = await Expense.create({
            title: String(title).trim(),
            amount: amountNum,
            category: cat._id,
            department: departmentId,
            month,
            createdBy: dbUser._id,
            status: "pending",
        });

        return NextResponse.json({ success: true, expense });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

/* ---------------------------- GET: list expenses --------------------------- */
export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const tokenUser = getTokenUser(req);
        if (!tokenUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const departmentQuery = searchParams.get("department");
        const month = searchParams.get("month");
        if (!month) return NextResponse.json({ error: "month required" }, { status: 400 });

        const dbUser = await User.findById(tokenUser.userId);
        if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // operator -> only own department, admin/finance -> can use query
        const depId = dbUser.role === "operator" ? String(dbUser.department_id || "") : String(departmentQuery || "");

        if (!depId) return NextResponse.json({ error: "department required" }, { status: 400 });
        if (!mongoose.Types.ObjectId.isValid(depId)) {
            return NextResponse.json({ error: "Invalid department id" }, { status: 400 });
        }

        const expenses = await Expense.find({ department: depId, month }).populate("category", "_id name").populate("createdBy", "_id username").sort({ createdAt: -1 }).populate("approvedBy", "_id username");

        // Optional: remove broken category refs so frontend doesn't crash
        const clean = expenses.filter((e: any) => e.category);

        return NextResponse.json(clean);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
