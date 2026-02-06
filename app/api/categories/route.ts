import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import Category from "@/models/Category";
import User from "@/models/User";
import { getTokenUser } from "@/lib/auth"; // <- use your helper that reads JWT cookie

export async function GET(req: NextRequest) {
    await dbConnect();

    const user = getTokenUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");

    // ✅ operator can only read their own department
    const depId = user.role === "operator" ? user.departmentId : department;

    if (!depId) return NextResponse.json({ error: "department required" }, { status: 400 });
    if (!mongoose.Types.ObjectId.isValid(depId)) return NextResponse.json({ error: "Invalid department id" }, { status: 400 });

    const categories = await Category.find({ department: depId }, "_id name").sort({ name: 1 });
    return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
    await dbConnect();

    const auth = getTokenUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["admin", "finance"].includes(auth.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { name, departmentId } = await req.json();
    if (!name || !departmentId) return NextResponse.json({ error: "name and departmentId required" }, { status: 400 });
    if (!mongoose.Types.ObjectId.isValid(departmentId)) return NextResponse.json({ error: "Invalid department id" }, { status: 400 });

    const me = await User.findById(auth.userId);
    const created = await Category.create({
        name: String(name).trim(),
        department: departmentId,
        createdBy: me?._id,
    });

    return NextResponse.json({ success: true, category: created });
}

export async function PATCH(req: NextRequest) {
    await dbConnect();

    const auth = getTokenUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["admin", "finance"].includes(auth.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id, name } = await req.json();
    if (!id || !name) return NextResponse.json({ error: "id and name required" }, { status: 400 });
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid category id" }, { status: 400 });

    const updated = await Category.findByIdAndUpdate(id, { name: String(name).trim() }, { new: true });
    if (!updated) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    return NextResponse.json({ success: true, category: updated });
}

