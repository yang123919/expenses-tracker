import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

type Role = "admin" | "finance" | "operator";

export const config = {
    matcher: [
        "/register", // ✅ add this
        "/dashboard/:path*",
        "/users/:path*",
        "/departments/:path*",
        "/categories/:path*",
        "/reports/:path*",
        "/approvals/:path*",
        "/api/:path*",
    ],
};

export default function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // ✅ Public routes
    const publicPaths = ["/", "/login", "/api/login"];
    if (publicPaths.includes(pathname)) return NextResponse.next();

    // ✅ Token
    const token = req.cookies.get("token")?.value || req.cookies.get("sessionToken")?.value;

    // ✅ API without token => JSON 401
    if (pathname.startsWith("/api") && !token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Page without token => redirect login
    if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as {
            userId: string;
            role: Role;
            email: string;
            departmentId?: string;
        };

        const role = decoded.role;

        // ✅ Pages protection
        if (pathname.startsWith("/users") && role !== "admin") {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }

        if (pathname.startsWith("/reports") && role === "operator") {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }

        if (pathname.startsWith("/approvals") && !["admin", "finance"].includes(role)) {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }

        if (pathname.startsWith("/departments/") && role === "operator") {
            const depId = pathname.split("/")[2];
            if (!decoded.departmentId || depId !== decoded.departmentId) {
                return NextResponse.redirect(new URL("/dashboard", req.url));
            }
        }

        // ✅ API protection
        if (pathname.startsWith("/api/users") && role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // departments/categories write actions only admin/finance
        if ((pathname.startsWith("/api/departments") || pathname.startsWith("/api/categories")) && !["admin", "finance"].includes(role)) {
            if (req.method === "GET") return NextResponse.next();
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // budgets write actions blocked for operator
        if (pathname.startsWith("/api/budgets") && role === "operator" && req.method !== "GET") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (pathname === "/register" && role !== "admin") {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }

        // ✅ API register: admin only
        if (pathname === "/api/register" && role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.next();
    } catch {
        if (pathname.startsWith("/api")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.redirect(new URL("/login", req.url));
    }
}
