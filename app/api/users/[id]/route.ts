import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

/* ---------------------------- GET: get user by id --------------------------- */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }, // ✅ Next 16 expects Promise
) {
    await dbConnect();

    const { id } = await params; // ✅ unwrap

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const user = await User.findById(id, "_id username email role department_id");
    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
}

/* --------------------------- DELETE: delete user by id ---------------------- */
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }, // ✅ Next 16 expects Promise
) {
    try {
        await dbConnect();

        const { id } = await params; // ✅ unwrap
        console.log("DELETE PARAM id:", id);

        if (!mongoose.isValidObjectId(id)) {
            return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
        }

        const user = await User.findById(id);
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // ✅ prevent deleting last admin
        if (user.role === "admin") {
            const admins = await User.countDocuments({ role: "admin" });
            if (admins <= 1) {
                return NextResponse.json({ error: "Cannot delete the last admin" }, { status: 403 });
            }
        }

        await User.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}
