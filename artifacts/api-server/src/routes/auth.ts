import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

const SECRET = process.env.SESSION_SECRET || "dev-secret-change-in-production";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const { name, email, password } = req.body ?? {};

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  if (!email || !isValidEmail(email)) {
    res.status(400).json({ error: "A valid email address is required" });
    return;
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(usersTable)
    .values({ name: name.trim(), email: email.toLowerCase().trim(), passwordHash })
    .returning();

  const token = jwt.sign({ userId: user.id, email: user.email }, SECRET, { expiresIn: "30d" });
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = jwt.sign({ userId: user.id, email: user.email }, SECRET, { expiresIn: "30d" });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

router.post("/auth/logout", (_req, res): void => {
  res.json({ ok: true });
});

export default router;
