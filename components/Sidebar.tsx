"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

type Role = "admin" | "finance" | "operator";

export default function Sidebar({ role, drawerOpen, onClose }: { role: Role; drawerOpen: boolean; onClose: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    const logout = async () => {
        await fetch("api/logout", {
            method: "POST",
            credentials: "include",
        });
        localStorage.removeItem("user");
        router.push("/login");
    };
    const navItems = [
        { name: "Dashboard", href: "/dashboard", roles: ["admin", "finance", "operator"] },
        { name: "Users", href: "/users", roles: ["admin"] },
        { name: "Departments", href: "/departments", roles: ["admin", "finance"] },
        { name: "Approvals", href: "/approvals", roles: ["admin", "finance"] },
        { name: "Reports", href: "/reports", roles: ["admin", "finance"] },
    ];

    const Nav = ({ onNavigate }: { onNavigate?: () => void }) => (
        <nav className="flex flex-col gap-1 p-2">
            {navItems
                .filter((item) => item.roles.includes(role))
                .map((item) => {
                    const active = pathname.startsWith(item.href);
                    return (
                        <Link key={item.name} href={item.href} onClick={onNavigate} className={`px-3 py-2 rounded text-sm ${active ? "bg-white/15 font-semibold text-white" : "hover:bg-white/10 text-white/90"}`}>
                            {item.name}
                        </Link>
                    );
                })}
        </nav>
    );

    return (
        <>
            {/* ✅ Desktop sidebar */}
            <aside className="hidden md:flex md:flex-col md:w-64 bg-gray-900 text-white sticky top-0 h-screen">
                <div className="p-4 border-b border-white/10 font-bold">Expense Tracker</div>
                <Nav />
                <button onClick={logout}>Log Out</button>
            </aside>

            {/* ✅ Mobile drawer */}
            {drawerOpen && (
                <div className="md:hidden fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
                    <div className="absolute left-0 top-0 h-full w-72 bg-gray-900 text-white shadow-xl">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <div className="font-bold">Menu</div>
                            <button onClick={onClose} className="px-3 py-2 rounded hover:bg-white/10" aria-label="Close menu">
                                ✕
                            </button>
                        </div>
                        <Nav onNavigate={onClose} />
                        <button onClick={logout}>Log Out</button>
                    </div>
                </div>
            )}
        </>
    );
}
