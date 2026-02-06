"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Role = "admin" | "finance" | "operator";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [role, setRole] = useState<Role>("operator");

    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (stored) {
            const u = JSON.parse(stored);
            if (u?.role) setRole(u.role);
        }
    }, []);

    return (
        <div className="min-h-screen bg-gray-100">
            {/* ✅ Mobile top bar */}
            <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-gray-900 text-white border-b border-white/10 flex items-center px-4">
                <button className="px-3 py-2 rounded hover:bg-white/10" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
                    ☰
                </button>
                <div className="ml-2 font-bold">Expense Tracker</div>
            </header>

            {/* ✅ Main layout */}
            <div className="flex">
                {/* Desktop sidebar + mobile drawer */}
                <Sidebar role={role} drawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

                {/* push content down on mobile because header is fixed */}
                <main className="flex-1 p-4 md:p-6 pt-16 md:pt-6">{children}</main>
            </div>
        </div>
    );
}
