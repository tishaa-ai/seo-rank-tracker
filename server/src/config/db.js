import mongoose from "mongoose";

// Connects to MongoDB once at startup. Exits the process if it fails,
// because the API is useless without a database.
export default async function connectDB() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("MONGODB_URI is not set. Copy .env.example to .env and fill it in.");
        process.exit(1);
    }

    try {
        await mongoose.connect(uri);
        console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
}
