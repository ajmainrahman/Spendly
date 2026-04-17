export default async function handler(req, res) {
  try {
    const mod = await import("../artifacts/api-server/dist/app.mjs");
    const app = mod.default;
    return app(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown serverless bootstrap error";
    console.error("API bootstrap failure:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: `API bootstrap failure: ${message}` }));
  }
}
