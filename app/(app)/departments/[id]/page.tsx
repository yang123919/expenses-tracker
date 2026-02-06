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

    // add expense form
    const [expTitle, setExpTitle] = useState("");
    const [expAmount, setExpAmount] = useState("");
    const [expCategoryId, setExpCategoryId] = useState("");
    const [actionError, setActionError] = useState("");

    const month = new Date().toISOString().slice(0, 7); // YYYY-MM

    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (stored) setUser(JSON.parse(stored));
    }, []);

    const canEditBudget = user?.role !== "operator";
    const canManageCategories = user?.role === "admin" || user?.role === "finance";
    const canAddExpense = user?.role === "operator";

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

            // default category for expense form
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, month]);

    const totalExpenses = useMemo(() => {
        return expenses.filter((e) => e.status === "approved").reduce((sum, e) => sum + e.amount, 0);
    }, [expenses]);

    const groupedExpenses = useMemo(() => {
        return expenses.reduce<Record<string, Expense[]>>((acc, e) => {
            acc[e.category.name] = acc[e.category.name] || [];
            acc[e.category.name].push(e);
            return acc;
        }, {});
    }, [expenses]);

    const saveBudget = async () => {
        setActionError("");
        if (!budgetInput) return;

        const res = await fetch("/api/budgets", {
            method: "POST",
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

    if (loading) return <p className="p-6">Loading...</p>;
    if (!department) return <p>Department not found</p>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="text-sm underline">
                    ← Back
                </button>
                <h1 className="text-3xl font-bold">{department.name}</h1>
            </div>

            {actionError && <p className="text-red-600">{actionError}</p>}

            {/* Budget */}
            <div className="rounded-xl p-6 text-white bg-gradient-to-r from-blue-500 to-purple-600">
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <h2 className="text-lg font-semibold mb-3">Monthly Budget</h2>

                        {canEditBudget ? (
                            <div className="flex gap-2">
                                <input type="number" className="text-black px-3 py-1 rounded" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} />
                                <button onClick={saveBudget} className="bg-white text-blue-600 px-4 py-1 rounded font-medium">
                                    Save
                                </button>
                            </div>
                        ) : (
                            <p className="text-2xl font-bold">RM {budget?.amount ?? 0}</p>
                        )}
                    </div>

                    <div className="text-right">
                        <p className="text-sm">Total Expenses</p>
                        <p className="text-2xl font-bold">RM {totalExpenses}</p>
                        <p className="mt-2 text-sm">
                            Remaining: <span className="font-bold">RM {(budget?.amount ?? 0) - totalExpenses}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Manage Categories (admin/finance) */}
            {canManageCategories && (
                <div className="bg-white rounded-xl shadow p-4 space-y-3">
                    <h2 className="text-lg font-semibold">Categories</h2>

                    <div className="flex gap-2">
                        <input className="border px-3 py-2 rounded w-full" placeholder="New category name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                        <button onClick={addCategory} className="bg-black text-white px-4 py-2 rounded">
                            Add
                        </button>
                    </div>

                    <ul className="space-y-2">
                        {categories.map((c) => (
                            <li key={c._id} className="flex justify-between items-center border rounded p-2 gap-2">
                                {editingCategoryId === c._id ? <input className="border px-2 py-1 rounded w-full" value={editingCategoryName} onChange={(e) => setEditingCategoryName(e.target.value)} autoFocus /> : <span>{c.name}</span>}

                                {editingCategoryId === c._id ? (
                                    <div className="flex gap-2">
                                        <button onClick={() => updateCategory(c._id)} className="text-green-600 underline">
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
                                        className="text-blue-600 underline"
                                    >
                                        Edit
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Add Expense (operator) */}
            {canAddExpense && (
                <div className="bg-white rounded-xl shadow p-4 space-y-3">
                    <h2 className="text-lg font-semibold">Add Expense</h2>

                    <input className="border px-3 py-2 rounded w-full" placeholder="Title" value={expTitle} onChange={(e) => setExpTitle(e.target.value)} />

                    <div className="flex gap-2">
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
            <div className="bg-white rounded-xl shadow divide-y">
                {Object.keys(groupedExpenses).length === 0 && <p className="p-6 text-gray-500">No expenses yet</p>}

                {Object.entries(groupedExpenses).map(([category, list]) => {
                    const categoryTotal = list.reduce((s, e) => s + e.amount, 0);

                    return (
                        <div key={category} className="p-4">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="font-semibold text-lg">
                                    {category} ({list.length})
                                </h2>
                                <span className="font-bold">RM {categoryTotal}</span>
                            </div>

                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small" stickyHeader aria-label="expenses table">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Title</TableCell>
                                            <TableCell>By</TableCell>
                                            <TableCell>Date</TableCell>
                                            <TableCell align="right">Amount</TableCell>
                                            <TableCell>Approved By</TableCell>
                                            <TableCell>Status</TableCell>
                                        </TableRow>
                                    </TableHead>

                                    <TableBody>
                                        {list.map((e) => (
                                            <TableRow key={e._id} hover>
                                                <TableCell>{e.title}</TableCell>
                                                <TableCell>{e.createdBy?.username || "-"}</TableCell>
                                                <TableCell>{new Date(e.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell align="right">RM {e.amount}</TableCell>
                                                <TableCell>{e.approvedBy?.username || "-"}</TableCell>
                                                <TableCell sx={{ textTransform: "capitalize" }}>{e.status}</TableCell>
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
    );
}
