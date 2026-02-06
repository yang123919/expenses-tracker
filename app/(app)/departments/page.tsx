"use client";

import { useEffect, useState } from "react";

type Department = {
    _id: string;
    name: string;
};

export default function DepartmentsPage() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [name, setName] = useState("");

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");

    const load = async () => {
        const res = await fetch("/api/departments", { credentials: "include" });
        const data = await res.json();
        setDepartments(data);
    };

    useEffect(() => {
        load();
    }, []);

    /* ---------------- ADD ---------------- */
    const addDepartment = async () => {
        if (!name.trim()) return;

        const res = await fetch("/api/departments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name }),
        });

        if (res.ok) {
            setName("");
            load();
        }
    };

    /* ---------------- UPDATE ---------------- */
    const updateDepartment = async (id: string) => {
        if (!editingName.trim()) return;

        const res = await fetch(`/api/departments/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name: editingName }),
        });

        if (!res.ok) {
            alert("Failed to update department");
            return;
        }

        setEditingId(null);
        setEditingName("");
        load();
    };

    return (
        <div className="space-y-6 max-w-xl">
            <h1 className="text-2xl font-bold">Departments</h1>

            {/* ADD */}
            <div className="flex gap-2">
                <input className="border p-2 flex-1" placeholder="Department name" value={name} onChange={(e) => setName(e.target.value)} />
                <button onClick={addDepartment} className="bg-black text-white px-4">
                    Add
                </button>
            </div>

            {/* LIST */}
            <ul className="border rounded divide-y">
                {departments.map((d) => (
                    <li key={d._id} className="p-3 flex justify-between items-center gap-2">
                        {editingId === d._id ? (
                            <>
                                <input className="border p-1 flex-1" value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                                <button onClick={() => updateDepartment(d._id)} className="text-green-600 underline">
                                    Save
                                </button>
                                <button onClick={() => setEditingId(null)} className="text-gray-500 underline">
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <>
                                <span>{d.name}</span>
                                <button
                                    onClick={() => {
                                        setEditingId(d._id);
                                        setEditingName(d.name);
                                    }}
                                    className="text-blue-600 underline"
                                >
                                    Edit
                                </button>
                            </>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
