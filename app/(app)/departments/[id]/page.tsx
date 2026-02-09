"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";

type User = {
    id: string;
    role: "admin" | "finance" | "operator";
    department_id?: string;
};

type Department = { _id: string; name: string };
type Budget = { amount: number };
type Category = { _id: string; name: string };

type Expense = {
    _id: string;
    title: string;
    amount: number;
    category: { _id: string; name: string };
    createdBy?: { username: string };
    approvedBy?: { username: string };
    createdAt: string;
    status: "pending" | "approved" | "rejected";
};

export default function DepartmentPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [user, setUser] = useState<User | null>(null);

    const [department, setDepartment] = useState<Department | null>(null);
    const [budget, setBudget] = useState<Budget | null>(null);
    const [budgetInput, setBudgetInput] = useState("");

    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategoryName, setNewCategoryName] = useState("");

    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState("");

    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    const [expTitle, setExpTitle] = useState("");
    const [expAmount, setExpAmount] = useState("");
    const [expCategoryId, setExpCategoryId] = useState("");
    const [actionError, setActionError] = useState("");

    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    const [editingAmount, setEditingAmount] = useState("");

    const canEditOrDeleteExpense = (e: Expense) => {
        if (user?.role === "operator") return e.status === "pending";
        if (user?.role === "admin") return true;

        return false;
    };

    const month = new Date().toISOString().slice(0, 7); // YYYY-MM

    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (stored) setUser(JSON.parse(stored));
    }, []);

    const canEditBudget = user?.role !== "operator";
    const canManageCategories = user?.role === "admin" || user?.role === "finance";
    const canAddExpense = user?.role === "operator";

    const rm = (n: number) => new Intl.NumberFormat("en-MY", { maximumFractionDigits: 0 }).format(n);

    const loadAll = async () => {
        if (!id) return;
        setLoading(true);
        setActionError("");

        try {
            const [deptRes, budgetRes, expenseRes, catRes] = await Promise.all([
                fetch(`/api/departments/${id}`, { credentials: "include" }),
                fetch(`/api/budgets?department=${id}&month=${month}`, { credentials: "include" }),
                fetch(`/api/expenses?department=${id}&month=${month}`, { credentials: "include" }),
                fetch(`/api/categories?department=${id}`, { credentials: "include" }),
            ]);

            if (!deptRes.ok) throw new Error("Failed to load department");

            const dept = await deptRes.json();

            const budgetText = await budgetRes.text();
            const budgetData = budgetText ? JSON.parse(budgetText) : null;

            const expensesText = await expenseRes.text();
            const expenseData = expensesText ? JSON.parse(expensesText) : [];

            const catsText = await catRes.text();
            const catsData = catsText ? JSON.parse(catsText) : [];

            setDepartment(dept);
            setBudget(budgetData);
            setBudgetInput(budgetData?.amount?.toString() || "");
            setExpenses(expenseData);
            setCategories(catsData);

            if (catsData?.length && !expCategoryId) setExpCategoryId(catsData[0]._id);
        } catch (err: any) {
            console.error(err);
            setActionError(err?.message || "Load failed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
    }, [id, month]);

    const totalExpenses = useMemo(() => {
        return expenses.filter((e) => e.status === "approved").reduce((sum, e) => sum + e.amount, 0);
    }, [expenses]);

    const groupedExpenses = useMemo(() => {
        return expenses.reduce<Record<string, Expense[]>>((acc, e) => {//reduce is loop through every expenses when it changes
            acc[e.category.name] = acc[e.category.name] || [];
            acc[e.category.name].push(e);
            return acc;
        }, {});
    }, [expenses]);

    const saveBudget = async () => {
        setActionError("");
        if (!budgetInput) return;

        const res = await fetch("/api/budgets", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                departmentId: id,
                month,
                amount: Number(budgetInput),
            }),
        });

        const bodyText = await res.text();
        const data = bodyText ? JSON.parse(bodyText) : {};

        if (!res.ok) {
            setActionError(data.error || "Failed to save budget");
            return;
        }

        await loadAll();
        alert("Budget saved");
    };

    const addCategory = async () => {
        setActionError("");
        if (!newCategoryName.trim()) return;

        const res = await fetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name: newCategoryName, departmentId: id }),
        });

        const text = await res.text();
        const data = text ? JSON.parse(text) : {};

        if (!res.ok) {
            setActionError(data.error || "Failed to add category");
            return;
        }

        setNewCategoryName("");
        await loadAll();
    };

    const updateCategory = async (categoryId: string) => {
        setActionError("");

        const name = editingCategoryName.trim();
        if (!name) {
            setActionError("Category name cannot be empty");
            return;
        }

        const res = await fetch(`/api/categories/${categoryId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name }),
        });

        const text = await res.text();
        const data = text ? JSON.parse(text) : {};

        if (!res.ok) {
            setActionError(data.error || "Failed to update category");
            return;
        }

        setEditingCategoryId(null);
        setEditingCategoryName("");
        await loadAll();
    };

    const addExpense = async () => {
        setActionError("");

        if (!expTitle.trim() || !expAmount || !expCategoryId) {
            setActionError("Fill title, amount, category");
            return;
        }

        const res = await fetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                title: expTitle,
                amount: Number(expAmount),
                categoryId: expCategoryId,
                month,
            }),
        });

        const text = await res.text();
        const data = text ? JSON.parse(text) : {};

        if (!res.ok) {
            setActionError(data.error || "Failed to add expense");
            return;
        }

        setExpTitle("");
        setExpAmount("");
        await loadAll();
    };
    const saveExpenseAmount = async (expenseId: string) => {
        setActionError("");

        const amt = Number(editingAmount);
        if (!editingAmount || Number.isNaN(amt) || amt <= 0) {
            setActionError("Amount must be a valid number");
            return;
        }

        const res = await fetch(`/api/expenses/${expenseId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ amount: amt }),
        });

        const text = await res.text();
        const data = text ? JSON.parse(text) : {};

        if (!res.ok) {
            setActionError(data.error || "Failed to update amount");
            return;
        }

        setEditingExpenseId(null);
        setEditingAmount("");

        await loadAll();
    };

    const deleteExpense = async (expenseId: string) => {
        setActionError("");

        if (!confirm("Delete this expense?")) return;

        const res = await fetch(`/api/expenses/${expenseId}`, {
            method: "DELETE",
            credentials: "include",
        });

        const text = await res.text();
        const data = text ? JSON.parse(text) : {};

        if (!res.ok) {
            setActionError(data.error || "Failed to delete expense");
            return;
        }

        // if we were editing this row, reset
        if (editingExpenseId === expenseId) {
            setEditingExpenseId(null);
            setEditingAmount("");
        }

        await loadAll();
    };

    if (loading) return <p className="p-6">Loading...</p>;
    if (!department) return <p className="p-6">Department not found</p>;

    const remaining = (budget?.amount ?? 0) - totalExpenses;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-sm underline">
                        ← Back
                    </button>
                    <h1 className="text-3xl font-bold">{department.name}</h1>
                </div>

                {actionError && <p className="text-red-600">{actionError}</p>}

                {/* Budget Bar */}
                <div className="rounded-2xl p-6 text-white bg-gradient-to-r from-blue-500 to-purple-600">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                        <div>
                            <h2 className="text-lg font-semibold mb-3">Monthly Budget</h2>

                            {canEditBudget ? (
                                <div className="flex flex-wrap gap-2 items-center">
                                    <input type="number" className="text-black px-3 py-2 rounded-md w-48" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} />
                                    <button onClick={saveBudget} className="bg-white text-blue-700 px-4 py-2 rounded-md font-medium">
                                        Save
                                    </button>
                                </div>
                            ) : (
                                <p className="text-2xl font-bold">RM {rm(budget?.amount ?? 0)}</p>
                            )}
                        </div>

                        <div className="text-right">
                            <p className="text-sm opacity-90">Total Expenses</p>
                            <p className="text-2xl font-bold">RM {rm(totalExpenses)}</p>
                            <p className="mt-2 text-sm">
                                Remaining: <span className="font-bold">RM {rm(remaining)}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Categories */}
                {canManageCategories && (
                    <div className="bg-white rounded-2xl shadow p-4 space-y-3">
                        <h2 className="text-lg font-semibold">Categories</h2>

                        <div className="flex gap-2">
                            <input className="border px-3 py-2 rounded w-full" placeholder="New category name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                            <button onClick={addCategory} className="bg-black text-white px-4 py-2 rounded shrink-0">
                                Add
                            </button>
                        </div>

                        <div className="space-y-2">
                            {categories.map((c) => (
                                <div key={c._id} className="border rounded-md px-3 py-2 flex items-center gap-2">
                                    <div className="flex-1">{editingCategoryId === c._id ? <input className="border px-2 py-1 rounded w-full" value={editingCategoryName} onChange={(e) => setEditingCategoryName(e.target.value)} autoFocus /> : <span>{c.name}</span>}</div>

                                    {editingCategoryId === c._id ? (
                                        <div className="flex gap-3 text-sm">
                                            <button onClick={() => updateCategory(c._id)} className="text-green-700 underline">
                                                Save
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingCategoryId(null);
                                                    setEditingCategoryName("");
                                                }}
                                                className="text-gray-600 underline"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setEditingCategoryId(c._id);
                                                setEditingCategoryName(c.name);
                                            }}
                                            className="text-blue-600 underline text-sm"
                                        >
                                            Edit
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Add Expense */}
                {canAddExpense && (
                    <div className="bg-white rounded-2xl shadow p-4 space-y-3">
                        <h2 className="text-lg font-semibold">Add Expense</h2>

                        <input className="border px-3 py-2 rounded w-full" placeholder="Title" value={expTitle} onChange={(e) => setExpTitle(e.target.value)} />

                        <div className="flex flex-col md:flex-row gap-2">
                            <input type="number" className="border px-3 py-2 rounded w-full" placeholder="Amount" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />

                            <select className="border px-3 py-2 rounded w-full" value={expCategoryId} onChange={(e) => setExpCategoryId(e.target.value)}>
                                {categories.map((c) => (
                                    <option key={c._id} value={c._id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button onClick={addExpense} className="bg-blue-600 text-white px-4 py-2 rounded">
                            Submit Expense
                        </button>
                    </div>
                )}

                {/* Expenses */}
                <div className="bg-white rounded-2xl shadow divide-y">
                    {Object.keys(groupedExpenses).length === 0 && <p className="p-6 text-gray-500">No expenses yet</p>}

                    {Object.entries(groupedExpenses).map(([category, list]) => {
                        const categoryTotal = list.reduce((s, e) => s + e.amount, 0);

                        return (
                            <div key={category} className="p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h2 className="font-semibold text-lg">
                                        {category} ({list.length})
                                    </h2>
                                    <span className="font-bold">RM {rm(categoryTotal)}</span>
                                </div>

                                <TableContainer
                                    component={Paper}
                                    variant="outlined"
                                    sx={{
                                        overflowX: "auto", // ✅ prevents squeeze on small screens
                                        borderRadius: 2,
                                    }}
                                >
                                    <Table
                                        size="small"
                                        stickyHeader
                                        aria-label="expenses table"
                                        sx={{
                                            minWidth: 700, // ✅ keeps columns readable
                                            "& th": { fontWeight: 700 },
                                        }}
                                    >
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Title</TableCell>
                                                <TableCell>By</TableCell>
                                                <TableCell>Date</TableCell>
                                                <TableCell align="right">Amount</TableCell>
                                                <TableCell>Reviewed By</TableCell>
                                                <TableCell>Status</TableCell>
                                                <TableCell align="right">Actions</TableCell>
                                            </TableRow>
                                        </TableHead>

                                        <TableBody>
                                            {list.map((e) => (
                                                <TableRow key={e._id} hover>
                                                    <TableCell>{e.title}</TableCell>
                                                    <TableCell>{e.createdBy?.username || "-"}</TableCell>
                                                    <TableCell>{new Date(e.createdAt).toLocaleDateString()}</TableCell>

                                                    {/* ✅ Amount (editable) */}
                                                    <TableCell align="right">
                                                        {editingExpenseId === e._id ? (
                                                            <div className="flex justify-end items-center gap-2">
                                                                <span>RM</span>
                                                                <input type="number" className="border rounded px-2 py-1 w-28 text-right" value={editingAmount} onChange={(ev) => setEditingAmount(ev.target.value)} />
                                                            </div>
                                                        ) : (
                                                            <>RM {rm(e.amount)}</>
                                                        )}
                                                    </TableCell>

                                                    <TableCell>{e.approvedBy?.username || "-"}</TableCell>
                                                    <TableCell sx={{ textTransform: "capitalize" }}>{e.status}</TableCell>
                                                    <TableCell align="right">
                                                        {canEditOrDeleteExpense(e) ? (
                                                            editingExpenseId === e._id ? (
                                                                <div className="flex justify-end gap-3 text-sm">
                                                                    <button onClick={() => saveExpenseAmount(e._id)} className="text-green-700 underline">
                                                                        Save
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingExpenseId(null);
                                                                            setEditingAmount("");
                                                                        }}
                                                                        className="text-gray-600 underline"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex justify-end gap-3 text-sm">
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingExpenseId(e._id);
                                                                            setEditingAmount(String(e.amount));
                                                                        }}
                                                                        className="text-blue-600 underline"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button onClick={() => deleteExpense(e._id)} className="text-red-600 underline">
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            )
                                                        ) : (
                                                            <span className="text-gray-400 text-sm">-</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
