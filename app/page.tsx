"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckSquare, Square } from "lucide-react";
import Image from "next/image";
import publishedCatalog from "@/data/catalog.published.json";
import { ProductCard } from "@/components/ProductCard";
import { PdfExport } from "@/components/PdfExport";
import { sortCatalog } from "@/lib/catalog";
import { fetchRepositoryJson } from "@/lib/github";
import { publicAsset } from "@/lib/paths";
import type { CatalogData } from "@/lib/types";

const fallbackCatalog = sortCatalog(publishedCatalog as CatalogData);

export default function CatalogPage() {
  const [catalog, setCatalog] = useState<CatalogData>(fallbackCatalog);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(() => fallbackCatalog.categories.map((category) => category.id));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetchRepositoryJson<CatalogData>("data/catalog.published.json", fallbackCatalog).then((data) => {
      const sorted = sortCatalog(data);
      setCatalog(sorted);
      setSelectedCategoryIds(sorted.categories.map((category) => category.id));
    });
  }, []);

  const visibleProducts = useMemo(() => {
    if (!selectedCategoryIds.length) return [];
    return catalog.products.filter((product) => selectedCategoryIds.includes(product.sectionId));
  }, [catalog.products, selectedCategoryIds]);

  const allCategoriesSelected = catalog.categories.length > 0 && selectedCategoryIds.length === catalog.categories.length;

  const selectedProducts = catalog.products.filter((product) => selectedIds.includes(product.id));

  function toggleProduct(id: string) {
    setNotice("");
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleVisibleSelection() {
    setNotice("");
    const visibleIds = visibleProducts.map((item) => item.id);
    const allVisibleSelected = visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) => {
      if (allVisibleSelected) return current.filter((id) => !visibleIds.includes(id));
      return Array.from(new Set([...current, ...visibleIds]));
    });
  }

  function toggleAllCategories() {
    setSelectedCategoryIds(allCategoriesSelected ? [] : catalog.categories.map((category) => category.id));
  }

  function toggleCategory(id: string) {
    setSelectedCategoryIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <main className="min-h-screen bg-[#f7f8f3]">
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-6 rounded-lg bg-white/60 p-5 shadow-soft lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Image
              src={publicAsset("/brand/logo.png")}
              alt="Белоруснефть"
              width={727}
              height={166}
              className="mb-5 h-auto w-full max-w-[260px] object-contain"
              priority
            />
            <h1 className="text-2xl font-bold leading-tight text-brand-900 sm:text-5xl">Каталог сувенирной продукции</h1>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center lg:justify-end">
            <button
              type="button"
              onClick={toggleVisibleSelection}
              className="inline-flex min-w-0 items-center justify-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-3 text-xs font-semibold text-brand-700 transition hover:border-brand-500 sm:px-4 sm:text-sm"
            >
              <CheckSquare size={18} />
              Выбрать все
            </button>
            <PdfExport
              catalog={catalog}
              products={selectedProducts}
              onEmpty={() => setNotice("Выберите хотя бы одну позицию, чтобы сформировать PDF.")}
            />
          </div>
        </header>

        <div className="rounded-lg bg-white/55 p-4 shadow-soft">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleAllCategories}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                allCategoriesSelected ? "border-brand-700 bg-brand-700 text-white" : "border-brand-200 bg-white text-brand-700 hover:bg-brand-50"
              }`}
            >
              {allCategoriesSelected ? <CheckSquare size={16} /> : <Square size={16} />}
              Все
            </button>
            {catalog.categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => toggleCategory(category.id)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  selectedCategoryIds.includes(category.id)
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-white bg-white text-brand-700 hover:bg-brand-50"
                }`}
              >
                {category.title}
              </button>
            ))}
          </div>
        </div>

        {notice ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{notice}</div> : null}

        <section className="catalog-grid grid grid-cols-1 gap-5 md:grid-cols-3 xl:grid-cols-4">
          {visibleProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              catalog={catalog}
              selectable
              selected={selectedIds.includes(product.id)}
              onToggle={toggleProduct}
            />
          ))}
        </section>
      </section>
    </main>
  );
}
