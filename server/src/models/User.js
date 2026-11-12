import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true, select: false }, // bcrypt hash, never returned by default
    },
    { timestamps: true }
);

// Shape sent to the client (no password)
userSchema.methods.toPublic = function () {
    return { _id: this._id, name: this.name, email: this.email, createdAt: this.createdAt };
};

export default mongoose.model("User", userSchema);
