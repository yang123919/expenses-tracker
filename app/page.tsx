import Link from "next/link";

export default function PublicDashboard() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center">
            <h1 className="text-4xl font-bold mb-4">Company Expense Tracker</h1>
            <p className="text-gray-600 mb-6">Manage budgets and expenses across departments</p>
            <div className="flex gap-4">
                <Link href="/login" className="btn-primary">
                    Login
                </Link>
            </div>
        </div>
    );
}
