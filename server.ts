import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { pipeline } from "./src/services/pipeline";
import { generateTransaction } from "./src/services/simulation";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Real-time Data Stream (SSE)
  app.get("/api/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const onProcessed = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    pipeline.on("processed", onProcessed);

    req.on("close", () => {
      pipeline.off("processed", onProcessed);
    });
  });

  // API to trigger manual training or get stats
  app.get("/api/stats", (req, res) => {
    res.json(pipeline.getStats());
  });

  // Simulation Loop (The "Producer")
  setInterval(() => {
    const tx = generateTransaction();
    pipeline.ingest(tx);
  }, 3000);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
