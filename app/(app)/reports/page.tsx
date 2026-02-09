"use client";

import { useEffect, useMemo, useState } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";

type Department = { _id: string; name: string };
type Budget = { amount: number };

type Expense = {
    _id: string;
    title: string;
    amount: number;
    category?: { _id?: string; name?: string } | null;
    createdBy?: { username: string } | null;
    approvedBy?: { username: string } | null;
    createdAt: string;
    status: "pending" | "approved" | "rejected";
};

export default function ReportsPage() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [departmentId, setDepartmentId] = useState("");
    const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM

    const [budget, setBudget] = useState<Budget | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    /* Load departments */
    useEffect(() => {
        fetch("/api/departments", { credentials: "include" })
            .then((r) => r.json())
            .then(setDepartments)
            .catch((e) => {
                console.error(e);
                setError("Failed to load departments");
            });
    }, []);

    /* Load report data */
    const loadReport = async () => {
        if (!departmentId || !month) {
            setError("Please select department and month");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const [budgetRes, expenseRes] = await Promise.all([
                fetch(`/api/budgets?department=${departmentId}&month=${month}`, {
                    credentials: "include",
                }),
                fetch(`/api/expenses?department=${departmentId}&month=${month}`, {
                    credentials: "include",
                }),
            ]);

            const budgetText = await budgetRes.text();
            const expenseText = await expenseRes.text();

            // If API returns error JSON, handle it nicely
            if (!budgetRes.ok) {
                const b = budgetText ? JSON.parse(budgetText) : {};
                setBudget(null);
                setError(b.error || "Failed to load budget");
            } else {
                setBudget(budgetText ? JSON.parse(budgetText) : null);
            }

            if (!expenseRes.ok) {
                const ex = expenseText ? JSON.parse(expenseText) : {};
                setExpenses([]);
                setError(ex.error || "Failed to load expenses");
            } else {
                setExpenses(expenseText ? JSON.parse(expenseText) : []);
            }
        } catch (e) {
            console.error(e);
            setError("Failed to load report");
        } finally {
            setLoading(false);
        }
    };
    const exportExcelServer = () => {
        if (!departmentId || !month) return;

        const url = `/api/reports/export?department=${departmentId}&month=${month}`;
        window.location.href = url;
    };

    const approvedTotal = useMemo(() => {
        return expenses.filter((e) => e.status === "approved").reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    }, [expenses]);

    const remaining = (budget?.amount ?? 0) - approvedTotal;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Monthly Reports</h1>

            {/* Filters */}
            <div className="bg-white p-4 rounded shadow flex flex-col md:flex-row gap-4">
                <select className="border p-2 rounded" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                        <option key={d._id} value={d._id}>
                            {d.name}
                        </option>
                    ))}
                </select>

                {/* month picker */}
                <input type="month" className="border p-2 rounded" value={month} onChange={(e) => setMonth(e.target.value)} />

                <button onClick={loadReport} className="bg-black text-white px-4 py-2 rounded">
                    View Report
                </button>
                <button onClick={exportExcelServer} className="bg-green-600 text-white px-4 py-2 rounded" disabled={loading || !departmentId || !month}>
                    Export Excel
                </button>
            </div>

            {error && <p className="text-red-600">{error}</p>}
            {loading && <p>Loading report…</p>}

            {!loading && departmentId && month && (
                <>
                    {/* Summary */}
                    <div className="bg-blue-600 text-white rounded-xl p-6">
                        <p className="text-sm">Budget</p>
                        <p className="text-2xl font-bold">RM {budget?.amount ?? 0}</p>

                        <p className="mt-3 text-sm">Approved Expenses</p>
                        <p className="text-2xl font-bold">RM {approvedTotal}</p>

                        <p className="mt-2 text-sm">
                            Remaining: <span className="font-bold">RM {remaining}</span>
                        </p>
                    </div>

                    {/* Expense Table */}
                    <TableContainer component={Paper} className="rounded shadow">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Title</TableCell>
                                    <TableCell>Category</TableCell>
                                    <TableCell>By</TableCell>
                                    <TableCell>Approved By</TableCell>
                                    <TableCell align="right">Amount</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Date</TableCell>
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {expenses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7}>No expenses found</TableCell>
                                    </TableRow>
                                ) : (
                                    expenses.map((e) => (
                                        <TableRow key={e._id}>
                                            <TableCell>{e.title}</TableCell>
                                            <TableCell>{e.category?.name ?? "-"}</TableCell>
                                            <TableCell>{e.createdBy?.username ?? "-"}</TableCell>
                                            <TableCell>{e.approvedBy?.username ?? "-"}</TableCell>
                                            <TableCell align="right">RM {e.amount}</TableCell>
                                            <TableCell className="capitalize">{e.status}</TableCell>
                                            <TableCell>{new Date(e.createdAt).toLocaleDateString()}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            )}
        </div>
    );
}
