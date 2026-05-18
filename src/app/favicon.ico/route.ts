import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET() {
  const favicon = await readFile(path.join(process.cwd(), "public/favicon.png"));

  return new Response(favicon, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
