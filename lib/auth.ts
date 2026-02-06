import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface AuthUser {
    userId: string;
    role: "admin" | "finance" | "operator";
    email: string;
    departmentId?: string; // ✅ add
}

export type TokenUser = {
    userId: string;
    email: string;
    role: "admin" | "finance" | "operator";
    departmentId?: string;
};

export function getAuthUser(req: NextRequest): AuthUser | null {
    const userId = req.headers.get("x-user-id");
    const role = req.headers.get("x-user-role") as AuthUser["role"];
    const email = req.headers.get("x-user-email");
    const departmentId = req.headers.get("x-user-department-id") || undefined;

    if (!userId || !role || !email) return null;
    return { userId, role, email, departmentId };
}

export function hasRole(user: AuthUser | null, allowedRoles: AuthUser["role"][]): boolean {
    if (!user) return false;
    return allowedRoles.includes(user.role);
}

export function generateToken(payload: { userId: string; email: string; role: "admin" | "finance" | "operator"; departmentId?: string }) {
    return jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: "7d",
    });
}

export function verifyToken(token: string): AuthUser | null {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
}

export function getTokenUser(req: NextRequest): TokenUser | null {
    const token = req.cookies.get("token")?.value || req.cookies.get("sessionToken")?.value;
    if (!token) return null;

    try {
        return jwt.verify(token, JWT_SECRET) as TokenUser;
    } catch {
        return null;
    }
}
