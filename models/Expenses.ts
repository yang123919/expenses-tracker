import mongoose, { Schema, models } from "mongoose";

const ExpenseSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        category: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        department: {
            type: Schema.Types.ObjectId,
            ref: "Department",
            required: true,
        },
        month: {
            type: String,
            required: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },

        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        approvedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
);

export default models.Expense || mongoose.model("Expense", ExpenseSchema);
