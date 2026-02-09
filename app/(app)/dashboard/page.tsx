"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type User = {
    id: string;
    username: string;
    email: string;
    role: "admin" | "finance" | "operator";
    department_id?: string;
};

type Department = { _id: string; name: string };

type Expense = {
    _id: string;
    amount: number;
    status: "pending" | "approved" | "rejected";
};

type DeptStats = {
    budgetAmount: number; // 0 if none
    approvedTotal: number; // only approved
};

export default function DashboardPage() {
    const [user, setUser] = useState<User | null>(null);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [stats, setStats] = useState<Record<string, DeptStats>>({});

    const month = new Date().toISOString().slice(0, 7); 

    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (stored) setUser(JSON.parse(stored));
    }, []);

    useEffect(() => {
        fetch("/api/departments", { credentials: "include" })
            .then((r) => r.json())
            .then(setDepartments)
            .catch(console.error);
    }, []);

    const visibleDepartments = useMemo(() => {
        if (!user) return [];
        if (user.role === "operator") {
            const depId = String(user.department_id || "");
            return departments.filter((d) => String(d._id) === depId);
        }
        return departments; // admin/finance -> all
    }, [user, departments]);

    // Fetch budget + approved total for each visible department
    useEffect(() => {
        if (visibleDepartments.length === 0) return;

        const loadStats = async () => {
            const entries = await Promise.all(
                visibleDepartments.map(async (dept) => {
                    let budgetAmount = 0;
                    try {
                        const bRes = await fetch(`/api/budgets?department=${dept._id}&month=${month}`, { credentials: "include" });
                        if (bRes.ok) {
                            const text = await bRes.text();
                            const b = text ? JSON.parse(text) : null;
                            budgetAmount = Number(b?.amount || 0);
                        }
                    } catch {}

                    // 2) Expenses for this dept & month (sum approved only)
                    let approvedTotal = 0;
                    try {
                        const eRes = await fetch(`/api/expenses?department=${dept._id}&month=${month}`, { credentials: "include" });
                        if (eRes.ok) {
                            const list: Expense[] = await eRes.json();
                            approvedTotal = list.filter((x) => x.status === "approved").reduce((sum, x) => sum + Number(x.amount || 0), 0);
                        }
                    } catch {}

                    return [dept._id, { budgetAmount, approvedTotal }] as const;
                }),
            );

            setStats(Object.fromEntries(entries));
        };

        loadStats();
    }, [visibleDepartments, month]);

    return (
        <div>
            <h1 className="text-3xl font-bold mb-4">Dashboard</h1>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {visibleDepartments.map((dept) => {
                    const s = stats[dept._id];
                    const budget = s?.budgetAmount ?? 0;
                    const approved = s?.approvedTotal ?? 0;
                    const remaining = budget - approved;

                    return (
                        <Link key={dept._id} href={`/departments/${dept._id}`} className="block">
                            <Card title={dept.name} month={month} budget={budget} approved={approved} remaining={remaining} />
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

function Card({ title, month, budget, approved, remaining }: { title: string; month: string; budget: number; approved: number; remaining: number }) {
    return (
        <div className="border p-4 rounded shadow-sm cursor-pointer hover:bg-gray-50">
            <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-semibold">{title}</h2>
                <span className="text-xs px-2 py-1 rounded bg-gray-100">{month}</span>
            </div>

            <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-600">Budget</span>
                    <span className="font-medium">RM {budget.toLocaleString()}</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-gray-600">Approved</span>
                    <span className="font-medium">RM {approved.toLocaleString()}</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-gray-600">Remaining</span>
                    <span className={`font-bold ${remaining >= 0 ? "text-green-600" : "text-red-600"}`}>RM {remaining.toLocaleString()}</span>
                </div>
                <p>Click to View</p>
            </div>
        </div>
    );
}
