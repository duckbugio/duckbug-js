import { Ignitor } from "@adonisjs/core";
import { HttpServer } from "@adonisjs/core/http";

const ignitor = new Ignitor(import.meta.url, {
  importer: (url) => import(url),
});

const httpServer = new HttpServer(ignitor, {
  port: 3333,
  host: "0.0.0.0",
});

await httpServer.start();
console.log(
  "🚀 DuckBug.js AdonisJS Example is running on http://localhost:3333",
);
