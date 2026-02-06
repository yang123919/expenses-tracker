import mongoose from "mongoose";

const BudgetSchema = new mongoose.Schema(
    {
        departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
        month: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
    },
    { timestamps: true },
);

BudgetSchema.index({ departmentId: 1, month: 1 }, { unique: true });

export default mongoose.models.Budget || mongoose.model("Budget", BudgetSchema);
