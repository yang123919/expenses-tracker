import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Department from "@/models/Department";
import mongoose from "mongoose";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid department id" }, { status: 400 });
    }

    const dept = await Department.findById(id, "_id name description");
    if (!dept) {
        return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    return NextResponse.json(dept);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
                                                     // ✅ params is Promise in your setup
    try {
        await dbConnect();

        const { id } = await params; // ✅ IMPORTANT
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid department id" }, { status: 400 });
        }

        const body = await req.json().catch(() => ({}));
        const name = String(body.name || "").trim();

        if (!name) {
            return NextResponse.json({ error: "Name required" }, { status: 400 });
        }

        const updated = await Department.findByIdAndUpdate(id, { name }, { new: true });

        if (!updated) {
            return NextResponse.json({ error: "Department not found" }, { status: 404 });
        }

        return NextResponse.json(updated);
    } catch (err) {
        console.error("PATCH /api/departments/[id] error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
