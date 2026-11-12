import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import protect from "../middleware/auth.js";
import AppError from "../utils/AppError.js";

const router = Router();

const createToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// POST /api/auth/register  { name, email, password }
router.post("/register", async (req, res) => {
    const { name, email, password } = req.body || {};
    if (!name?.trim() || !email?.trim() || !password) throw new AppError("Name, email and password are required");
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new AppError("Please enter a valid email");
    if (password.length < 6) throw new AppError("Password must be at least 6 characters");

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) throw new AppError("An account with this email already exists", 409);

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });

    res.status(201).json({ token: createToken(user), user: user.toPublic() });
});

// POST /api/auth/login  { email, password }
router.post("/login", async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) throw new AppError("Email and password are required");

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    const valid = user && (await bcrypt.compare(password, user.password));
    if (!valid) throw new AppError("Invalid email or password", 401);

    res.json({ token: createToken(user), user: user.toPublic() });
});

// GET /api/auth/me  (needs token)
router.get("/me", protect, (req, res) => {
    res.json({ user: req.user.toPublic() });
});

export default router;
