import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET() {
    try {
        await dbConnect();
        const users = await User.find({}, "_id username email role department_id").sort({ createdAt: -1 });
        return NextResponse.json(users);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

