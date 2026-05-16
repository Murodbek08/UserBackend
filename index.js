import express from "express";
import { PrismaClient } from "./prisma/generated/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
app.use(express.json());

// Prisma 7 ulanish
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Ulanishni tekshirish
async function startServer() {
  try {
    await prisma.$connect();
    console.log("✅ PostgreSQL ga ulanish muvaffaqiyatli");

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Ulanish xatosi:", error.message);
    process.exit(1);
  }
}

startServer();

// --- 3. UYG'OTUVCHI (Self-Ping) ---
// Har 10 daqiqada bot o'ziga so'rov yuboradi
setInterval(
  () => {
    // Render-da loyiha yaratganingizdan keyin beriladigan URL-ni shu yerga qo'ying
    const RENDER_URL = "https://user-backend-alfx.onrender.com/users";
    axios
      .get(RENDER_URL)
      .then(() => console.log("⏰ Bot uyg'oq saqlandi!"))
      .catch((err) => console.log("⏰ Uyg'otish xabari yuborildi."));
  },
  10 * 60 * 1000,
);

// Hamma userlarni olish
app.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User qushish
app.post("/users", async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await prisma.user.create({
      data: {
        name,
        email,
      },
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bitta userni olish id orqali
app.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User malumotlarini yangilash
app.patch("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        name,
        email,
      },
    });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Userni o'chirish
app.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.delete({
      where: { id: parseInt(id) },
    });
    res.status(200).json(user);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        message: `ID ${req.params.id} bo'lgan user topilmadi`,
      });
    }
    res.status(500).json({ error: error.message });
  }
});
