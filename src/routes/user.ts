import { Hono } from "hono";
import { sign } from "hono/jwt";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
    prisma: any;
  };
}>();

userRouter.use("*", async (c, next) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  c.set("prisma", prisma);
  await next();
});

userRouter.post("/signup", async (c) => {
  // const prisma = new PrismaClient({
  //   datasourceUrl: c.env?.DATABASE_URL,
  // }).$extends(withAccelerate());
  const prisma = c.get("prisma");
  const body: {
    name: string;
    email: string;
    password: string;
  } = await c.req.json();

  try {
    const resp = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: body.password,
      },
    });
    const jwt = await sign({ id: resp.id }, c.env.JWT_SECRET);
    return c.json({ jwt });
  } catch (e) {
    c.status(403);
    return c.json({ error: "error while signing up" });
  }
});

userRouter.post("/signin", async (c) => {
//   const prisma = new PrismaClient({
//     datasourceUrl: c.env?.DATABASE_URL,
//   }).$extends(withAccelerate());
  const prisma = c.get("prisma");
  const body: {
    email: string;
    password: string;
  } = await c.req.json();
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: body.email,
      },
    });
    if (user?.password === body.password) {
      const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);
      return c.json({ jwt });
    }
    c.status(403);
    return c.json({ error: "invalid credentials" });
  } catch (e) {
    c.status(403);
    return c.json({ error: "error while signing in" });
  }
});
