/**
 * BM25 keyword ranking — a zero-dependency retrieval fallback that needs no
 * embeddings or API. Good enough for the small KIZ knowledge base and keeps
 * the concierge working when the embedding provider is unavailable.
 */

const STOPWORDS = new Set([
  // English
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "to", "of", "and", "or", "in", "on",
  "at", "for", "with", "by", "from", "as", "it", "its", "this", "that", "these", "those", "i",
  "you", "we", "they", "he", "she", "my", "your", "our", "their", "do", "does", "did", "can",
  "could", "will", "would", "should", "how", "what", "when", "where", "which", "who", "why", "if",
  "about", "into", "there", "here", "not", "no", "yes", "please", "want", "need", "get", "got",
  // Malay
  "yang", "dan", "atau", "untuk", "dengan", "pada", "di", "ke", "dari", "ini", "itu", "saya",
  "aku", "kau", "kami", "kita", "adalah", "ialah", "ada", "tak", "tidak", "boleh", "macam",
  "mana", "apa", "bila", "siapa", "kenapa", "bagaimana", "nak", "mahu", "sila",
])

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f\u4e00-\u9fff]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
}

export interface Bm25Doc {
  id: string
  text: string
}

export interface Bm25Result {
  id: string
  score: number
  /** Fraction of unique query tokens that appear in the document (0–1). */
  overlap: number
}

const K1 = 1.5
const B = 0.75

export function bm25Rank(query: string, docs: Bm25Doc[]): Bm25Result[] {
  const queryTokens = Array.from(new Set(tokenize(query)))
  if (queryTokens.length === 0 || docs.length === 0) {
    return docs.map((d) => ({ id: d.id, score: 0, overlap: 0 }))
  }

  const docTokens = docs.map((d) => tokenize(d.text))
  const docLengths = docTokens.map((t) => t.length)
  const avgdl = docLengths.reduce((a, b) => a + b, 0) / docs.length || 1

  // Document frequency per query token.
  const df = new Map<string, number>()
  for (const token of queryTokens) {
    let count = 0
    for (const tokens of docTokens) {
      if (tokens.includes(token)) count++
    }
    df.set(token, count)
  }

  const N = docs.length

  return docs.map((doc, i) => {
    const tokens = docTokens[i]
    const dl = docLengths[i] || 1
    const freq = new Map<string, number>()
    for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1)

    let score = 0
    let matched = 0
    for (const token of queryTokens) {
      const tf = freq.get(token) ?? 0
      if (tf > 0) matched++
      const n = df.get(token) ?? 0
      const idf = Math.log((N - n + 0.5) / (n + 0.5) + 1)
      score += idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * dl) / avgdl)))
    }

    return { id: doc.id, score, overlap: matched / queryTokens.length }
  })
}
