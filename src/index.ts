import Fastify from "fastify";
import env from "@fastify/env";
import { ZodError } from "zod";
import { registerRoutes } from "./routes";

const envSchema = {
  type: "object",
  required: ["PORT", "DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"],
  properties: {
    PORT: { type: "string", default: "5001" },
    NODE_ENV: { type: "string", default: "development" },
    DB_HOST: { type: "string", default: "localhost" },
    DB_PORT: { type: "string", default: "5432" },
    DB_NAME: { type: "string", default: "twinqle" },
    DB_USER: { type: "string", default: "twinqle" },
    DB_PASSWORD: { type: "string" },
  },
};

const buildServer = async () => {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
    },
  });

  await fastify.register(env, {
    confKey: "config",
    schema: envSchema,
    dotenv: true,
  });

  fastify.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  await registerRoutes(fastify);

  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          message: "Validation error",
          statusCode: 400,
          details: error.issues,
        },
      });
    }

    return reply.status(error.statusCode || 500).send({
      error: {
        message: error.message || "Internal Server Error",
        statusCode: error.statusCode || 500,
      },
    });
  });

  return fastify;
};

const start = async () => {
  try {
    const fastify = await buildServer();
    const port = parseInt(process.env.PORT || "5001", 10);
    const host = "0.0.0.0";

    await fastify.listen({ port, host });
    console.log(`Server listening on http://${host}:${port}`);
  } catch (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }
};

start();
