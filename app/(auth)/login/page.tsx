"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
                credentials: "include",
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Invalid credentials");
                return;
            }

            // Store user info in localStorage
            localStorage.setItem("user", JSON.stringify(data.user));

            router.push("/dashboard");
        } catch (err) {
            setError("Network error");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center">
            <form onSubmit={submit} className="w-96 space-y-4">
                <h1 className="text-2xl font-bold">Login</h1>
                {error && <p className="text-red-500">{error}</p>}
                <input placeholder="Email" className="border p-2 w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input type="password" placeholder="Password" className="border p-2 w-full" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button className="bg-black text-white w-full p-2">Login</button>
            </form>
        </div>
    );
}
