"use client";

import { useEffect, useState } from "react";

type Department = { _id: string; name: string };
type Category = { _id: string; name: string };

export default function CategoriesPage() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [departmentId, setDepartmentId] = useState("");
    const [categories, setCategories] = useState<Category[]>([]);
    const [name, setName] = useState("");

    useEffect(() => {
        fetch("/api/departments", { credentials: "include" })
            .then((r) => r.json())
            .then(setDepartments);
    }, []);

    useEffect(() => {
        if (!departmentId) return;

        fetch(`/api/categories?department=${departmentId}`, {
            credentials: "include",
        })
            .then((r) => r.json())
            .then(setCategories);
    }, [departmentId]);

    const addCategory = async () => {
        if (!name || !departmentId) return;

        const res = await fetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name, department: departmentId }),
        });

        if (res.ok) {
            setName("");
            setCategories(await res.json());
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Categories</h1>

            <select className="border p-2" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">Select Department</option>
                {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                        {d.name}
                    </option>
                ))}
            </select>

            {departmentId && (
                <>
                    <div className="flex gap-2">
                        <input className="border p-2" placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} />
                        <button onClick={addCategory} className="bg-black text-white px-4">
                            Add
                        </button>
                    </div>

                    <ul className="border rounded divide-y">
                        {categories.map((c) => (
                            <li key={c._id} className="p-2">
                                {c.name}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}
