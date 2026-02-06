import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

export async function PATCH(req: NextRequest) {
    await dbConnect();

    const { userId, role } = await req.json();

    if (!userId || !role) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (!["admin", "finance", "operator"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    await User.findByIdAndUpdate(userId, { role });

    return NextResponse.json({ success: true });
}


