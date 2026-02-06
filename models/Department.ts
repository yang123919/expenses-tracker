import mongoose, { Schema, models } from "mongoose";

const DepartmentSchema = new Schema(
    {
        name: { type: String, required: true, unique: true },
        description: String,
    },
    { timestamps: true },
);

export default models.Department || mongoose.model("Department", DepartmentSchema);
