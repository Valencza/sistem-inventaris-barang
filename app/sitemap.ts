import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://inventory.example.com"

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/produk`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ]

  // In a real app, you would fetch products from the database
  // and generate URLs for each product
  // For now, we'll include some sample product URLs
  const productSlugs = [
    "laptop-asus-rog",
    "iphone-15-pro",
    "samsung-galaxy-s24",
    "kaos-polos-premium",
    "celana-jeans-slim-fit",
    "kopi-arabika-gayo",
    "teh-hijau-organik",
    "blender-philips",
    "rice-cooker-miyako",
    "vitamin-c-1000mg",
  ]

  const productPages: MetadataRoute.Sitemap = productSlugs.map((slug) => ({
    url: `${baseUrl}/produk/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }))

  return [...staticPages, ...productPages]
}
