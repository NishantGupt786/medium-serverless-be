import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { sign, verify } from "hono/jwt";

const app = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
    prisma: any;
  };
}>();

app.use("*", async (c, next) => {
	const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  c.set("prisma", prisma);
  await next();
})

app.use("/api/v1/blog/*", async (c, next) => {
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

app.post("/api/v1/signup", async (c) => {
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

app.post("/api/v1/signin", async (c) => {
  // const prisma = new PrismaClient({
  //   datasourceUrl: c.env?.DATABASE_URL,
  // }).$extends(withAccelerate());
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

app.get("/api/v1/blog/:id", (c) => {
  const id = c.req.param("id");
  console.log(id);
  return c.text("get blog route");
});

app.get("/api/v1/blog", (c) => {
  console.log(c.get('userId'));
	return c.text('signin route')
});

app.post("/api/v1/blog", (c) => {
  console.log(c.get('userId'));
	return c.text('signin route')
});

app.put("/api/v1/blog", (c) => {
  return c.text("signin route");
});

app.get("/", (c) => {
  return c.text("Welcome to Hono");
});

export default app;
