import mongoose, { Schema, models } from "mongoose";

const CategorySchema = new Schema(
    {
        name: { type: String, required: true },
        department: { type: Schema.Types.ObjectId, ref: "Department", required: true }, // ✅ add this
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true },
);

// prevent duplicates inside same department
CategorySchema.index({ department: 1, name: 1 }, { unique: true });

export default models.Category || mongoose.model("Category", CategorySchema);
