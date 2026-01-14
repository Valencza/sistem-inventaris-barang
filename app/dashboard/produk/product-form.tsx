"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useStore } from "@/components/providers/store-provider";
import { toast } from "sonner";
import type { Product, Category } from "@/lib/types";
import { generateSlug } from "@/lib/utils/slug";

interface ProductFormProps {
  productId?: string;
}

/**
 * Form tambah/edit produk yang terhubung ke API backend:
 * - Jika productId ada → mode edit (load data dari /api/produk/[id]).
 * - Jika productId kosong → mode tambah baru (POST /api/produk).
 */
export function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter();
  const { isReady } = useStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    sku: "",
    description: "",
    price: "",
    categoryId: "",
    minStock: "",
    isActive: true,
  });

  // Load kategori + detail produk (jika edit) setelah auth siap
  useEffect(() => {
    if (!isReady) return;
    void loadInitialData();
  }, [isReady, productId]);

  /**
   * Ambil:
   * - daftar kategori dari /api/kategori
   * - detail produk (jika productId ada) dari /api/produk/[id]
   */
  const loadInitialData = async () => {
    try {
      // Set status edit berdasarkan ada/tidaknya productId
      setIsEditing(Boolean(productId));

      // 1) Ambil kategori (RBAC: category.view)
      const kategoriRes = await fetch("/api/kategori", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!kategoriRes.ok) {
        const err = await kategoriRes.json().catch(() => null);
        throw new Error(err?.message || "Gagal memuat kategori");
      }

      const kategoriJson = await kategoriRes.json()
      setCategories((kategoriJson.data ?? kategoriJson.categories) || [])

      // 2) Jika edit, ambil detail produk (RBAC: product.view)
      if (productId) {
        const detailRes = await fetch(`/api/produk/${productId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!detailRes.ok) {
          toast.error("Produk tidak ditemukan");
          router.push("/dashboard/produk");
          return;
        }

        const { product } = (await detailRes.json()) as {
          product: Product & { minStock: number };
        };

        setFormData({
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          description: product.description || "",
          price: String(product.price ?? ""),
          categoryId: product.categoryId,
          minStock: String(product.minStock ?? 0),
          isActive: product.isActive,
        });

        setIsEditing(true);
      }
    } catch (error: any) {
      console.error("Load initial product data error", error);
      toast.error(error?.message || "Gagal memuat data produk");
      if (productId) router.push("/dashboard/produk");
    }
  };

  /**
   * Auto-generate slug ketika nama diubah (hanya untuk mode tambah).
   */
  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: isEditing ? prev.slug : generateSlug(name),
    }));
  };

  /**
   * Submit form:
   * - POST /api/produk untuk tambah baru.
   * - PUT /api/produk/[id] untuk edit.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const body = {
        name: formData.name,
        slug: formData.slug,
        sku: formData.sku,
        description: formData.description || null,
        price: Number.parseFloat(formData.price) || 0,
        categoryId: formData.categoryId,
        minStock: Number.parseInt(formData.minStock) || 0,
        isActive: formData.isActive,
      };

      const url = productId ? `/api/produk/${productId}` : "/api/produk";
      const method = productId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Gagal menyimpan produk");
      }

      toast.success(
        isEditing ? "Produk berhasil diperbarui" : "Produk berhasil ditambahkan",
      );
      router.push("/dashboard/produk");
    } catch (error: any) {
      console.error("Save product error", error);
      toast.error(error?.message || "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEditing ? "Edit Produk" : "Tambah Produk"}
        description={
          isEditing
            ? "Perbarui data produk"
            : "Tambahkan produk baru ke inventaris"
        }
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Produk", href: "/dashboard/produk" },
          { label: isEditing ? "Edit" : "Tambah" },
        ]}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informasi Produk</CardTitle>
                <CardDescription>Data dasar produk</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Produk *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Nama produk"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU *</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          sku: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="SKU-001"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug URL</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    placeholder="nama-produk"
                  />
                  <p className="text-xs text-muted-foreground">
                    URL: /produk/{formData.slug || "nama-produk"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Deskripsi produk..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Harga & Stok</CardTitle>
                <CardDescription>
                  Pengaturan harga dan stok minimum
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="price">Harga (Rp) *</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          price: e.target.value,
                        }))
                      }
                      placeholder="0"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minStock">Minimum Stok</Label>
                    <Input
                      id="minStock"
                      type="number"
                      min="0"
                      value={formData.minStock}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          minStock: e.target.value,
                        }))
                      }
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Peringatan akan muncul jika stok di bawah nilai ini
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Kategori</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, categoryId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Produk Aktif</p>
                    <p className="text-sm text-muted-foreground">
                      Tampilkan di katalog publik
                    </p>
                  </div>
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isActive: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full gap-2" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEditing ? "Simpan Perubahan" : "Tambah Produk"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
