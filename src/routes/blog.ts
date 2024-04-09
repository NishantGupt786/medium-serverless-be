import { Hono } from "hono";
import { sign, verify } from "hono/jwt";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
    prisma: any;
  };
}>();

blogRouter.use("*", async (c, next) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  c.set("prisma", prisma);
  await next();
});

blogRouter.use("*", async (c, next) => {
  const jwt = c.req.header("Authorization");
  if (!jwt) {
    c.status(401);
    return c.json({ error: "unauthorized" });
  }
  const token = jwt.split(" ")[1];
  const payload = await verify(token, c.env.JWT_SECRET);
  if (!payload) {
    c.status(401);
    return c.json({ error: "unauthorized" });
  }
  c.set("userId", payload.id);
  await next();
});

blogRouter.get("/get-individual-blog/:id", async (c) => {
  const id = c.req.param("id");
  const prisma = c.get("prisma");
  try {
    const resp = await prisma.post.findUnique({
      where: {
        id: id,
      },
    });
    return c.json(resp);
  } catch (e: any) {
    c.status(403);
    return c.json({ error: e.message });
  }
});

blogRouter.get("/get-all-blogs", async (c) => {
  const prisma = c.get("prisma");
  try {
    const resp = await prisma.post.findMany();
    return c.json(resp);
  } catch (e: any) {
    c.status(403);
    return c.json({ error: e.message });
  }
});

blogRouter.get("/get-blogs-from-user", async (c) => {
    const prisma = c.get("prisma");
  const id = c.get("userId");
  try{
    const resp = await prisma.post.findMany({
      where: {
        authorId: id,
      },
    });
    return c.json(resp);
  } catch (e: any) {
    c.status(403);
    return c.json({ error: e.message });
  }
});

blogRouter.post("/", async (c) => {
  const prisma = c.get("prisma");

  const body: {
    title: string;
    content: string;
    authorId: string;
  } = await c.req.json();
  const id = c.get("userId");
  try {
    const resp = await prisma.post.create({
      data: {
        title: body.title,
        content: body.content,
        authorId: id,
      },
    });
    return c.json(resp);
  } catch (e: any) {
    c.status(403);
    return c.json({ error: e.message });
  }
});

blogRouter.put("/", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const authorid = c.get("userId");
  const body: {
    id: string;
    title: string;
    content: string;
  } = await c.req.json();
  try {
    const post = await prisma.post.findUnique({
      where: {
        id: body.id,
      },
    });
    if (post?.authorId === authorid) {
      const resp = await prisma.post.update({
        where: {
          id: body.id,
        },
        data: {
          title: body.title,
          content: body.content,
        },
      });
      return c.json(resp);
    }
    c.status(403);
    return c.json({ error: "unauthorized" });
  } catch (e: any) {
    c.status(403);
    return c.json({ error: e.message });
  }
});
