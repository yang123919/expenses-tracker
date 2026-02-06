"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Role = "admin" | "finance" | "operator";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {



    return (
        <div className="min-h-screen bg-gray-100">
            <div className="pt-14 flex">
                <main className="flex-1 p-4 md:p-6">{children}</main>
            </div>
        </div>
    );
}
