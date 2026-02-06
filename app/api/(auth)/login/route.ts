import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import { generateToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        console.log("LOGIN ROUTE HANDLER RUNNING");

        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const token = generateToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
            departmentId: user.department_id ? user.department_id.toString() : undefined,
        });

        const res = NextResponse.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                department_id: user.department_id,
            },
        });

        // Set cookie
        res.cookies.set("token", token, {
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        return res;
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
