import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';

async function run() {
  const articlesDir = path.join(process.cwd(), 'src/content/articles');
  const jsonPath = path.join(process.cwd(), 'articles.json');
  
  console.log("Reading Markdown files from src/content/articles...");
  const files = (await fs.readdir(articlesDir)).filter(f => f.endsWith('.md'));
  
  const articles = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(articlesDir, file), 'utf8');
    const parts = raw.split('---');
    if (parts.length < 3) continue;
    
    const fm = parts[1];
    const content = parts.slice(2).join('---').trim();
    
    // Simple frontmatter parser
    const titleMatch = fm.match(/title:\s*"([^"]+)"/) || fm.match(/title:\s*([^\n]+)/);
    const catMatch = fm.match(/category:\s*"([^"]+)"/) || fm.match(/category:\s*([^\n]+)/);
    const descMatch = fm.match(/description:\s*"([^"]+)"/) || fm.match(/description:\s*([^\n]+)/);
    const dateMatch = fm.match(/date:\s*"([^"]+)"/) || fm.match(/date:\s*([^\n]+)/);
    
    const title = titleMatch ? titleMatch[1].trim() : file.replace('.md', '');
    const category = catMatch ? catMatch[1].trim() : 'mind';
    const description = descMatch ? descMatch[1].trim() : '';
    const date = dateMatch ? dateMatch[1].trim() : new Date().toISOString();
    
    const slug = file.replace('.md', '');
    
    articles.push({
      slug,
      title,
      description,
      content,
      category,
      status: 'published',
      impact_score: 9,
      created_at: new Date(date).toISOString(),
      published_at: new Date(date).toISOString()
    });
  }
  
  console.log(`Parsed ${articles.length} articles from Markdown. Saving to articles.json...`);
  await fs.writeFile(jsonPath, JSON.stringify(articles, null, 2), 'utf8');
  
  console.log("Running D1 sync script...");
  execSync('node scripts/sync-all-to-d1.js', { stdio: 'inherit' });
  console.log("All articles successfully synced to Cloudflare D1 database and articles.json!");
}

run().catch(e => {
  console.error("Batch sync failed:", e);
  process.exit(1);
});
