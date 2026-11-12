import jwt from "jsonwebtoken";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";

// Reads "Authorization: Bearer <token>", verifies it and puts the user on req.user
export default async function protect(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new AppError("Not logged in", 401);

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        throw new AppError("Session expired, please log in again", 401);
    }

    const user = await User.findById(payload.id);
    if (!user) throw new AppError("User no longer exists", 401);

    req.user = user;
    next();
}
