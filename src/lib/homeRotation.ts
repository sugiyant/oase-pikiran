/**
 * homeRotation.ts
 * Logika rotasi artikel halaman Home (R1-R5).
 * Tanpa dependency eksternal, murni TypeScript/JavaScript.
 */

export interface ArticleManifest {
  slug: string;
  title: string;
  description: string;
  category: string;
  published_at: string;
}

export interface RotationState {
  deckOrder: string[];
  cursor: number;
  lastRotationDate: string;
  poolSizeAtShuffle: number;
  todaysSlugs?: string[]; // Disimpan langsung agar kunjungan hari yang sama 100% konsisten & identik (R1)
}

const STORAGE_KEY = "oase-pikiran:home-rotation:v1";

// Helper: Fisher-Yates Shuffle
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Helper: Get local YYYY-MM-DD string
function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper: Read state from localStorage safely
function readState(): RotationState | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Failed to read rotation state", e);
    return null;
  }
}

// Helper: Write state to localStorage safely
function writeState(state: RotationState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to write rotation state", e);
  }
}

/**
 * Mendapatkan artikel untuk ditampilkan di halaman home sesuai aturan rotasi.
 */
export function getHomeArticles(allPublished: ArticleManifest[], N = 5): ArticleManifest[] {
  if (allPublished.length === 0) return [];
  if (allPublished.length <= N) return allPublished; // Fallback jika total pool < N

  const today = getLocalDateString();
  const state = readState();

  const freshnessCount = 2;
  const deckCount = N - freshnessCount;

  // R3: 2 slot teratas berdasarkan tanggal publish DESC (freshness)
  const freshnessArticles = [...allPublished]
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    .slice(0, freshnessCount);

  // R1: Jika sudah rotasi di hari yang sama, langsung kembalikan todaysSlugs apa adanya (tanpa rekonstruksi cursor)
  if (state && state.lastRotationDate === today && state.todaysSlugs && state.todaysSlugs.length > 0) {
    const cachedArticles = state.todaysSlugs
      .map(slug => allPublished.find(a => a.slug === slug))
      .filter((a): a is ArticleManifest => !!a);
    
    // Pastikan jumlahnya sesuai N jika tidak ada artikel yang terhapus/unpublish
    if (cachedArticles.length === N) {
      return cachedArticles;
    }
  }

  const threshold = 0.2; // R5: 20% threshold reshuffle
  const needsReshuffle =
    !state ||
    state.cursor + deckCount > state.deckOrder.length ||
    Math.abs(allPublished.length - state.poolSizeAtShuffle) > state.poolSizeAtShuffle * threshold;

  let newDeckOrder = state ? state.deckOrder : [];
  let nextCursor = state ? state.cursor : 0;

  if (needsReshuffle) {
    newDeckOrder = shuffle(allPublished.map(a => a.slug));
    nextCursor = 0;
  }

  // R2 & R4: Ambil dari deck dengan diversifikasi pillar/category (maksimal 2 dari kategori sama)
  const selectedSlugs: string[] = [];
  let tempCursor = nextCursor;

  while (selectedSlugs.length < deckCount && tempCursor < newDeckOrder.length) {
    const candidateSlug = newDeckOrder[tempCursor];
    const candidateArticle = allPublished.find(a => a.slug === candidateSlug);

    if (!candidateArticle) {
      tempCursor++;
      continue;
    }

    const currentCategory = candidateArticle.category;
    const categoryCountInSet = [...freshnessArticles, ...selectedSlugs.map(slug => allPublished.find(a => a.slug === slug))]
      .filter(a => a && a.category === currentCategory).length;

    let shouldSkip = categoryCountInSet >= 2;
    let jumpCount = 0;
    let lookAheadCursor = tempCursor;

    while (shouldSkip && jumpCount < 5 && lookAheadCursor + 1 < newDeckOrder.length) {
      lookAheadCursor++;
      const nextCandidateSlug = newDeckOrder[lookAheadCursor];
      const nextCandidateArticle = allPublished.find(a => a.slug === nextCandidateSlug);

      if (nextCandidateArticle) {
        const nextCategory = nextCandidateArticle.category;
        const nextCategoryCount = [...freshnessArticles, ...selectedSlugs.map(slug => allPublished.find(a => a.slug === slug))]
          .filter(a => a && a.category === nextCategory).length;

        if (nextCategoryCount < 2) {
          tempCursor = lookAheadCursor;
          shouldSkip = false;
          break;
        }
      }
      jumpCount++;
    }

    const finalSlug = newDeckOrder[tempCursor];
    if (!selectedSlugs.includes(finalSlug)) {
      selectedSlugs.push(finalSlug);
    }
    tempCursor++;
  }

  nextCursor = tempCursor;

  // Gabungkan freshness slot + deck slot dengan deduplikasi (R3)
  const freshnessSlugs = freshnessArticles.map(a => a.slug);
  const deckArticles = selectedSlugs
    .map(slug => allPublished.find(a => a.slug === slug))
    .filter((a): a is ArticleManifest => !!a);

  const uniqueArticles: ArticleManifest[] = [...freshnessArticles];
  for (const art of deckArticles) {
    if (!freshnessSlugs.includes(art.slug) && uniqueArticles.length < N) {
      uniqueArticles.push(art);
    }
  }

  // Backfill jika kurang dari N
  if (uniqueArticles.length < N) {
    for (const slug of newDeckOrder) {
      const art = allPublished.find(a => a.slug === slug);
      if (art && !uniqueArticles.some(a => a.slug === slug) && uniqueArticles.length < N) {
        uniqueArticles.push(art);
      }
    }
  }

  // Simpan state lengkap termasuk todaysSlugs untuk konsistensi kunjungan berulang di hari yang sama
  const finalSlugs = uniqueArticles.map(a => a.slug);
  writeState({
    deckOrder: newDeckOrder,
    cursor: nextCursor,
    lastRotationDate: today,
    poolSizeAtShuffle: allPublished.length,
    todaysSlugs: finalSlugs
  });

  return uniqueArticles;
}
