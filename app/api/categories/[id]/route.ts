import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Category from "@/models/Category";
import mongoose from "mongoose";
import { getTokenUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    await dbConnect();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
    }

    const user = getTokenUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // admin/finance only
    if (!["admin", "finance"].includes(user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name } = await req.json();
    if (!name?.trim()) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const category = await Category.findById(id);
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    category.name = name.trim();
    await category.save();

    return NextResponse.json({ success: true, category });
}
