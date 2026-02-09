"use client";

import { useEffect, useState } from "react";

type Role = "admin" | "finance" | "operator";

type StoredUser = {
    id: string;
    role: Role;
    department_id?: string;
};

type ApprovalExpense = {
    _id: string;
    title: string;
    amount: number;
    month: string;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
    department?: { _id: string; name: string } | string;
    category?: { _id: string; name: string } | null;
    createdBy?: { _id: string; username: string; email: string };
};

type Department = { _id: string; name: string };

export default function ApprovalsPage() {
    const [user, setUser] = useState<StoredUser | null>(null);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [departmentFilter, setDepartmentFilter] = useState("");
    const [rows, setRows] = useState<ApprovalExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    // Load user from localStorage
    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (stored) setUser(JSON.parse(stored));
    }, []);

    useEffect(() => {
        fetch("/api/departments", { credentials: "include" })
            .then((r) => r.json())
            .then((data) => setDepartments(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, []);

    const loadApprovals = async () => {
        setLoading(true);
        setErr("");

        try {
            const qs = new URLSearchParams();
            qs.set("month", month);
            if (user?.role === "admin" && departmentFilter) qs.set("department", departmentFilter);

            const res = await fetch(`/api/approvals?${qs.toString()}`, { credentials: "include" });
            const text = await res.text();
            const data = text ? JSON.parse(text) : [];

            if (!res.ok) {
                setErr(data?.error || "Failed to load approvals");
                setRows([]);
                return;
            }

            setRows(Array.isArray(data) ? data : []);
        } catch (e) {
            setErr("Network / JSON error");
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user) return;
        loadApprovals();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, month, departmentFilter]);

    const approveOrReject = async (expenseId: string, status: "approved" | "rejected") => {
        const ok = confirm(`${status === "approved" ? "Approve" : "Reject"} this expense?`);
        if (!ok) return;

        const res = await fetch(`/api/approvals/${expenseId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ status }),
        });

        const text = await res.text();
        const data = text ? JSON.parse(text) : {};

        if (!res.ok) {
            alert(data?.error || "Failed");
            return;
        }

        // Remove from list (because it is no longer pending)
        setRows((prev) => prev.filter((r) => r._id !== expenseId));
    };

    const canUsePage = user && (user.role === "admin" || user.role === "finance");

    const pendingCount = rows.length;

    if (!user) return <div className="p-6">Loading user...</div>;

    if (!canUsePage) {
        return <div className="p-6 text-red-600">Forbidden: only admin/finance can view approvals.</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-bold">Approvals</h1>
                <div className="text-sm text-gray-600">Pending: {pendingCount}</div>
            </div>

            <div className="bg-white border rounded p-4 flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Month</span>
                    <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border rounded px-2 py-1" />
                </div>

                {(user.role === "admin" || user.role === "finance") && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Department</span>
                        <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="border rounded px-2 py-1">
                            <option value="">All</option>
                            {departments.map((d) => (
                                <option key={d._id} value={d._id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <button onClick={loadApprovals} className="ml-auto border rounded px-3 py-1 hover:bg-gray-50">
                    Refresh
                </button>
            </div>

            {err && <div className="text-red-600">{err}</div>}

            <div className="bg-white border rounded overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left p-3">Title</th>
                            <th className="text-left p-3">Department</th>
                            <th className="text-left p-3">Category</th>
                            <th className="text-right p-3">Amount</th>
                            <th className="text-left p-3">Created By</th>
                            <th className="text-left p-3">Date</th>
                            <th className="text-center p-3">Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td className="p-4" colSpan={7}>
                                    Loading...
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td className="p-4 text-gray-500" colSpan={7}>
                                    No pending expenses
                                </td>
                            </tr>
                        ) : (
                            rows.map((r) => (
                                <tr key={r._id} className="border-b last:border-b-0">
                                    <td className="p-3">{r.title}</td>

                                    <td className="p-3">{typeof r.department === "string" ? r.department : r.department?.name || "-"}</td>

                                    <td className="p-3">{r.category?.name ?? "-"}</td>

                                    <td className="p-3 text-right">RM {Number(r.amount).toLocaleString()}</td>

                                    <td className="p-3">{r.createdBy?.username || "-"}</td>

                                    <td className="p-3">{new Date(r.createdAt).toLocaleDateString()}</td>

                                    <td className="p-3">
                                        <div className="flex gap-2 justify-center">
                                            <button onClick={() => approveOrReject(r._id, "approved")} className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700">
                                                Approve
                                            </button>
                                            <button onClick={() => approveOrReject(r._id, "rejected")} className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">
                                                Reject
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
