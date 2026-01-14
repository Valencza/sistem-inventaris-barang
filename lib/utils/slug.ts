/**
 * Helper untuk generate slug dari teks nama produk.
 * - Konversi ke lowercase
 * - Ganti non-alfanumerik dengan "-"
 * - Trim "-" di awal/akhir
 */
export function generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  