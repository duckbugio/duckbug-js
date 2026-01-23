import express from "express";
import { duck } from "./duckbug";
import routes from "./routes";

const app = express();
const PORT = 3000;

// Middleware for logging requests
app.use((req, _res, next) => {
  duck.log("Request", {
    method: req.method,
    path: req.path,
    timestamp: Date.now(),
  });
  next();
});

app.use(express.json());
app.use(routes);

app.listen(PORT, () => {
  console.log(
    `🚀 DuckBug.js Express Example is running on http://localhost:${PORT}`,
  );
});
