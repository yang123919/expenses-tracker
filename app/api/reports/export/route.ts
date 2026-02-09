import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import Expense from "@/models/Expenses";
import Budget from "@/models/Budget";
import { getTokenUser } from "@/lib/auth";
import mongoose from "mongoose";
import ExcelJS from "exceljs";

// IMPORTANT: ExcelJS needs Node runtime (not Edge)
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const tokenUser = getTokenUser(req);
        if (!tokenUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const dbUser = await User.findById(tokenUser.userId);
        if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const departmentQuery = searchParams.get("department");
        const month = searchParams.get("month");

        if (!month) return NextResponse.json({ error: "month required" }, { status: 400 });

        // operator -> only own department, admin/finance -> can use query
        const depId = dbUser.role === "operator" ? String(dbUser.department_id || "") : String(departmentQuery || "");

        if (!depId) return NextResponse.json({ error: "department required" }, { status: 400 });
        if (!mongoose.Types.ObjectId.isValid(depId)) {
            return NextResponse.json({ error: "Invalid department id" }, { status: 400 });
        }

        // Load data
        const [budget, expenses] = await Promise.all([Budget.findOne({ departmentId: depId, month }), Expense.find({ department: depId, month }).populate("category", "_id name").populate("createdBy", "_id username").populate("approvedBy", "_id username").sort({ createdAt: -1 })]);

        const approvedTotal = expenses.filter((e: any) => e.status === "approved").reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

        const budgetAmount = Number(budget?.amount || 0);
        const remaining = budgetAmount - approvedTotal;

        // Build workbook
        const wb = new ExcelJS.Workbook();
        wb.creator = "Expense Tracker";
        wb.created = new Date();

        // Sheet 1: Summary
        const wsSummary = wb.addWorksheet("Summary");
        wsSummary.columns = [
            { header: "Item", key: "item", width: 25 },
            { header: "Value", key: "value", width: 40 },
        ];

        wsSummary.addRows([
            { item: "Department ID", value: depId },
            { item: "Month", value: month },
            { item: "Budget (RM)", value: budgetAmount },
            { item: "Approved Expenses (RM)", value: approvedTotal },
            { item: "Remaining (RM)", value: remaining },
        ]);

        wsSummary.getRow(1).font = { bold: true };

        // Sheet 2: Expenses
        const ws = wb.addWorksheet("Expenses");
        ws.columns = [
            { header: "Title", key: "title", width: 30 },
            { header: "Category", key: "category", width: 18 },
            { header: "By", key: "by", width: 16 },
            { header: "Approved By", key: "approvedBy", width: 16 },
            { header: "Amount (RM)", key: "amount", width: 14 },
            { header: "Status", key: "status", width: 12 },
            { header: "Date", key: "date", width: 14 },
        ];

        ws.getRow(1).font = { bold: true };

        expenses.forEach((e: any) => {
            ws.addRow({
                title: e.title,
                category: e.category?.name ?? "-",
                by: e.createdBy?.username ?? "-",
                approvedBy: e.approvedBy?.username ?? "-",
                amount: Number(e.amount) || 0,
                status: e.status,
                date: e.createdAt ? new Date(e.createdAt).toLocaleDateString() : "-",
            });
        });

        ws.getColumn("amount").numFmt = "#,##0.00";

        const buffer = await wb.xlsx.writeBuffer();

        const filename = `Report_${month}_${depId}.xlsx`;
        return new NextResponse(buffer as any, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
