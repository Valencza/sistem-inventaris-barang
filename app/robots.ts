import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://inventory.example.com"

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/produk", "/produk/*"],
        disallow: ["/dashboard", "/dashboard/*", "/login", "/api/*"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
