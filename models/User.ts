import mongoose, { Schema, models } from "mongoose";

const UserSchema = new Schema(
    {
        username: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        password: { type: String, required: true },
        role: { type: String, enum: ["admin", "finance", "operator"], default: "operator" },
        department_id: { type: Schema.Types.ObjectId, ref: "Department" },
    },
    { timestamps: true },
);

export default models.User || mongoose.model("User", UserSchema);
