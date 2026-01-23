import Fastify from "fastify";
import { duck } from "./duckbug";
import { routes } from "./routes";

// Extend FastifyInstance type
declare module "fastify" {
  interface FastifyInstance {
    duck: typeof duck;
  }
}

const fastify = Fastify({
  logger: true,
});

// Register DuckBug as a decorator
fastify.decorate("duck", duck);

// Add hook for logging requests
fastify.addHook("onRequest", async (request) => {
  duck.log("Request", {
    method: request.method,
    path: request.url,
    timestamp: Date.now(),
  });
});

// Register routes
await fastify.register(routes);

const PORT = 3000;

fastify.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(
    `🚀 DuckBug.js Fastify Example is running on http://localhost:${PORT}`,
  );
});
