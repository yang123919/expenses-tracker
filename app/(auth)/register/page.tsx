"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [departmentId, setDepartmentId] = useState("");
    const [departments, setDepartments] = useState<{ _id: string; name: string }[]>([]);
    const router = useRouter();

    useEffect(() => {
        fetch("/api/departments", { credentials: "include" })
            .then((res) => res.json())
            .then(setDepartments)
            .catch(console.error);
    }, []);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();

        const res = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // ✅ no credentials needed (we are NOT logging in)
            body: JSON.stringify({
                username,
                email,
                password,
                department_id: departmentId,
            }),
        });

        const text = await res.text();
        const data = text ? JSON.parse(text) : {};

        if (res.ok) {
            alert("User created!");
            router.push("/users"); // ✅ go back to users list
        } else {
            alert(data.error || "Failed to create user");
        }
    };

    return (
        <>
            <div className="flex min-h-screen items-center justify-center">
                <div className="w-full max-w-md space-y-8 rounded-lg border p-8 shadow-md">
                    <form onSubmit={submit} className="w-96 space-y-4">
                        <h1 className="text-2xl font-bold">Create User</h1>
                        <input placeholder="Username" className="border p-2 w-full" onChange={(e) => setUsername(e.target.value)} />
                        <input placeholder="Email" className="border p-2 w-full" onChange={(e) => setEmail(e.target.value)} />
                        <input type="password" placeholder="Password" className="border p-2 w-full" onChange={(e) => setPassword(e.target.value)} />

                        <select className="border p-2 w-full" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required>
                            <option value="">Select Department</option>
                            {departments.map((dept) => (
                                <option key={dept._id} value={dept._id}>
                                    {dept.name}
                                </option>
                            ))}
                        </select>

                        <button className="bg-black text-white w-full p-2">Register</button>
                    </form>
                </div>
            </div>
        </>
    );
}
