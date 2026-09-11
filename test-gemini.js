import { generateText } from "./scripts/lib/ai.js";
import fs from "fs/promises";

// Load from ~/.hermes/.env manually since we are running it direct
const envContent = await fs.readFile("/home/sugiyanto/.hermes/.env", "utf-8");
for (const line of envContent.split("\n")) {
  if (line && !line.startsWith("#") && line.includes("=")) {
    const [k, ...v] = line.split("=");
    process.env[k.trim()] = v.join("=").trim();
  }
}

try {
  const res = await generateText("Hello! Say 'OK' if you can hear me.");
  console.log("Response:", res);
} catch (e) {
  console.error("Error:", e);
}
