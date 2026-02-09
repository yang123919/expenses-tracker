import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import mongoose from "mongoose";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    await dbConnect();

    const id = params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const user = await User.findById(id, "_id username email role department_id");
    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();

        const { id } = await params; 
        console.log("DELETE PARAM id:", id);

        if (!mongoose.isValidObjectId(id)) {
            return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
        }

        const user = await User.findById(id);
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        if (user.role === "admin") {
            const admins = await User.countDocuments({ role: "admin" });
            if (admins <= 1) {
                return NextResponse.json({ error: "Cannot delete yourself" }, { status: 403 });
            }
        }

        await User.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}
