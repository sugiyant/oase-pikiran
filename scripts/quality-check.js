import fs from "node:fs/promises";
import path from "node:path";

const dir = path.join(process.cwd(), "src/content/articles");
let files = [];
try {
  files = (await fs.readdir(dir)).filter(f => f.endsWith(".md"));
} catch (e) {
  console.error("Articles directory not found:", dir);
}

const banned = ["you won't believe", "10x your", "secret hack", "guaranteed", "miracle cure", "get rich quick"];
const moderatingPatterns = [
  /moral\s+(dari|nya)?\s*cerita/i,
  /pelajaran\s+(dari|yang\s+bisa\s+(kita)?\s*(ambil|petik))/i,
  /pesannya\s+(adalah|jelas)/i
];

const officialCategories = [
  "Islam", "Mind", "Philosophy", "History", "Science", 
  "Technology", "World", "Culture", "People", "Life"
];

let bad = false;
for (const f of files) {
  // Hanya validasi artikel baru yang berawalan "1000w"
  if (!f.includes("1000w")) {
    continue;
  }

  const filePath = path.join(dir, f);
  const content = await fs.readFile(filePath, "utf8");
  const lower = content.toLowerCase();

  // 1. Clickbait / Banned
  for (const x of banned) {
    if (lower.includes(x)) {
      console.error(`${f}: suspicious phrase "${x}"`);
      bad = true;
    }
  }

  // 2. Min word count (750+)
  const words = content.split(/\s+/).length;
  if (words < 750) {
    console.error(`${f}: suspiciously short (${words} words, need 750+)`);
    bad = true;
  }

  // 3. Reflection question check
  if (!/##\s*pertanyaan\s+reflektif/i.test(content)) {
    console.error(`${f}: missing "## Pertanyaan Reflektif" section`);
    bad = true;
  }

  // 4. No moderating / didactic conclusion check
  for (const pat of moderatingPatterns) {
    if (pat.test(content)) {
      console.error(`${f}: contains forbidden didactic concluding pattern (${pat})`);
      bad = true;
    }
  }

  // 5. Raw metadata in body check
  if (/^Kategori\s*:/m.test(content) || /^Sudut\s+Pandang\s*:/m.test(content)) {
    console.error(`${f}: contains raw metadata (Kategori:/Sudut Pandang:) in body text`);
    bad = true;
  }
}

if (bad) {
  console.error("Quality check FAILED (Fail-Closed triggered).");
  process.exit(1);
} else {
  console.log("Quality heuristics passed successfully.");
}
