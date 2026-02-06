"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";

type User = {
    _id: string;
    username: string;
    email: string;
    role: string;
};

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const router = useRouter();

    useEffect(() => {
        fetch("/api/users", { credentials: "include" })
            .then((r) => r.json())
            .then(setUsers);
    }, []);

    const updateRole = async (userId: string, role: string) => {
        await fetch("/api/users/role", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ userId, role }),
        });

        setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role } : u)));
    };

    const deleteUser = async (userId: string) => {
        const ok = confirm("Are you sure you want to delete this user?");
        if (!ok) return;

        const res = await fetch(`/api/users/${userId}`, {
            method: "DELETE",
            credentials: "include",
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            alert(data.error || "Failed to delete user");
            return;
        }

        // ✅ remove from UI
        setUsers((prev) => prev.filter((u) => u._id !== userId));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Users</h1>

                {/* Create User */}
                <Button variant="contained" onClick={() => router.push("/register")}>
                    + Create User
                </Button>
            </div>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>User</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell align="right">Action</TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {users.map((u) => (
                            <TableRow key={u._id} hover>
                                <TableCell>{u.username}</TableCell>
                                <TableCell>{u.email}</TableCell>

                                <TableCell>
                                    <Select size="small" value={u.role} onChange={(e) => updateRole(u._id, e.target.value)} sx={{ minWidth: 120 }}>
                                        <MenuItem value="operator">Operator</MenuItem>
                                        <MenuItem value="finance">Finance</MenuItem>
                                        <MenuItem value="admin">Admin</MenuItem>
                                    </Select>
                                </TableCell>

                                {/* ✅ DELETE BUTTON */}
                                <TableCell align="right">
                                    <Button color="error" size="small" onClick={() => deleteUser(u._id)}>
                                        Delete
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    );
}
