import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import { getTokenUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        const tokenUser = getTokenUser(req);
        if (!tokenUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (tokenUser.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const { username, email, password, department_id } = await req.json();

        if (!username || !email || !password || !department_id) {
            return NextResponse.json({ error: "All fields required" }, { status: 400 });
        }

        const exists = await User.findOne({ email: email.toLowerCase() });
        if (exists) return NextResponse.json({ error: "Email already exists" }, { status: 400 });

        const hashed = await bcrypt.hash(password, 10);

        const user = await User.create({
            username,
            email: email.toLowerCase(),
            password: hashed,
            role: "operator",
            department_id,
        });

        return NextResponse.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                department_id: user.department_id,
            },
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
