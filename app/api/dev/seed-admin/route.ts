import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: NextRequest) {
    await dbConnect();

    const secret = req.headers.get("x-seed-secret");
    if (!secret || secret !== process.env.SEED_SECRET) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email } = await req.json();
    if (!email) {
        return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const user = await User.findOneAndUpdate({ email: email.toLowerCase() }, { role: "admin" }, { new: true });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: { id: user._id, email: user.email, role: user.role } });
}
