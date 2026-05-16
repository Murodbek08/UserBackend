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

// Har 10 daqiqada bot o'ziga so'rov yuboradi
setInterval(
  () => {
    const RENDER_URL = "https://user-backend-alfx.onrender.com/users";
    axios
      .get(RENDER_URL)
      .then(() => console.log("⏰ Bot uyg'oq saqlandi!"))
      .catch((err) => console.log("⏰ Uyg'otish xabari yuborildi."));
  },
  10 * 60 * 1000,
);

// ============ USER ROUTES ============

// Hamma userlarni olish
app.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { posts: true },
      orderBy: { id: "desc" },
    });
    res.status(200).json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: error.message });
  }
});

// User qo'shish
app.post("/users", async (req, res) => {
  try {
    const { name, email } = req.body;

    // Validatsiya
    if (!name || !email) {
      return res.status(400).json({
        message: "Name va email majburiy",
      });
    }

    const user = await prisma.user.create({
      data: { name, email },
    });
    res.status(201).json(user);
  } catch (error) {
    // Email takrorlanishi
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "Bu email allaqachon mavjud",
      });
    }
    console.error("Create user error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Bitta userni olish (id orqali)
app.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    // ID ni tekshirish
    if (isNaN(userId)) {
      return res.status(400).json({ message: "ID son bo'lishi kerak" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { posts: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User topilmadi" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: error.message });
  }
});

// User ma'lumotlarini yangilash
app.patch("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const { name, email } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ message: "ID son bo'lishi kerak" });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name, email },
    });

    res.status(200).json(user);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "User topilmadi" });
    }
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Bu email allaqachon mavjud" });
    }
    console.error("Update user error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Userni o'chirish
app.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return res.status(400).json({ message: "ID son bo'lishi kerak" });
    }

    const user = await prisma.user.delete({
      where: { id: userId },
    });

    res.status(200).json({
      message: "User o'chirildi",
      user: user,
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        message: `ID ${req.params.id} bo'lgan user topilmadi`,
      });
    }
    console.error("Delete user error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============ POST ROUTES ============

// Hamma postlarni olish
app.get("/posts", async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: { author: true },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(posts);
  } catch (error) {
    console.error("Get posts error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Bitta postni olish (id orqali)
app.get("/posts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const postId = parseInt(id);

    if (isNaN(postId)) {
      return res.status(400).json({ message: "ID son bo'lishi kerak" });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { author: true },
    });

    if (!post) {
      return res.status(404).json({ message: "Post topilmadi" });
    }

    res.status(200).json(post);
  } catch (error) {
    console.error("Get post error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Post qo'shish
app.post("/posts", async (req, res) => {
  try {
    const { title, content, authorId, published } = req.body;

    // Validatsiya
    if (!title || !authorId) {
      return res.status(400).json({
        message: "Title va authorId majburiy",
      });
    }

    const post = await prisma.post.create({
      data: {
        title,
        content: content || "",
        authorId: parseInt(authorId),
        published: published || false,
      },
      include: { author: true },
    });

    res.status(201).json(post);
  } catch (error) {
    if (error.code === "P2003") {
      return res.status(404).json({
        message: "Bunday ID li user topilmadi",
      });
    }
    console.error("Create post error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Post tahrirlash (yangilash)
app.patch("/posts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const postId = parseInt(id);
    const { title, content, published } = req.body;

    if (isNaN(postId)) {
      return res.status(400).json({ message: "ID son bo'lishi kerak" });
    }

    const post = await prisma.post.update({
      where: { id: postId },
      data: {
        title,
        content,
        published,
      },
      include: { author: true },
    });

    res.status(200).json(post);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Post topilmadi" });
    }
    console.error("Update post error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Postni publish qilish (maxsus endpoint)
app.patch("/posts/:id/publish", async (req, res) => {
  try {
    const { id } = req.params;
    const postId = parseInt(id);

    if (isNaN(postId)) {
      return res.status(400).json({ message: "ID son bo'lishi kerak" });
    }

    const post = await prisma.post.update({
      where: { id: postId },
      data: { published: true },
      include: { author: true },
    });

    res.status(200).json(post);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Post topilmadi" });
    }
    console.error("Publish post error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Post o'chirish
app.delete("/posts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const postId = parseInt(id);

    if (isNaN(postId)) {
      return res.status(400).json({ message: "ID son bo'lishi kerak" });
    }

    const post = await prisma.post.delete({
      where: { id: postId },
    });

    res.status(200).json({
      message: "Post o'chirildi",
      post: post,
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        message: `ID ${req.params.id} bo'lgan post topilmadi`,
      });
    }
    console.error("Delete post error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============ QO'SHIMCHA ENDPOINTLAR ============

// Userni postlari bilan birga olish
app.get("/users/:id/with-posts", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return res.status(400).json({ message: "ID son bo'lishi kerak" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        posts: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User topilmadi" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Get user with posts error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Statistika
app.get("/stats", async (req, res) => {
  try {
    const [userCount, postCount, publishedCount] = await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.post.count({ where: { published: true } }),
    ]);

    res.status(200).json({
      totalUsers: userCount,
      totalPosts: postCount,
      publishedPosts: publishedCount,
      unpublishedPosts: postCount - publishedCount,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============ SERVER START ============
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Prisma Studio: npx prisma studio`);
      console.log(`\n📝 API Endpointlar:`);
      console.log(`   GET    /users                 - Barcha userlar`);
      console.log(`   POST   /users                 - User yaratish`);
      console.log(`   GET    /users/:id             - Bitta user`);
      console.log(`   PATCH  /users/:id             - User yangilash`);
      console.log(`   DELETE /users/:id             - User o'chirish`);
      console.log(`   GET    /posts                 - Barcha postlar`);
      console.log(`   GET    /posts/:id             - Bitta post`);
      console.log(`   POST   /posts                 - Post yaratish`);
      console.log(`   PATCH  /posts/:id             - Post yangilash`);
      console.log(`   PATCH  /posts/:id/publish     - Postni publish qilish`);
      console.log(`   DELETE /posts/:id             - Post o'chirish`);
      console.log(`   GET    /users/:id/with-posts  - User + postlari`);
      console.log(`   GET    /stats                 - Statistika`);
    });
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
}

startServer();
