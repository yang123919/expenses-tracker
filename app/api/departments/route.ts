import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Department from "@/models/Department";

// GET: Fetch all departments
export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const departments = await Department.find({}, "_id name").sort({ name: 1 });
        return NextResponse.json(departments);
    } catch (err) {
        console.error("Failed to fetch departments:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

// POST: Add a new department
export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const { name, description } = await req.json();

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        // Prevent duplicates
        const exists = await Department.findOne({ name });
        if (exists) {
            return NextResponse.json({ error: "Department already exists" }, { status: 400 });
        }

        const department = await Department.create({ name, description });
        return NextResponse.json({ success: true, department });
    } catch (err) {
        console.error("Failed to add department:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}



// DELETE: Delete a department
export async function DELETE(req: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }

        const department = await Department.findByIdAndDelete(id);
        if (!department) {
            return NextResponse.json({ error: "Department not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Department deleted" });
    } catch (err) {
        console.error("Failed to delete department:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
