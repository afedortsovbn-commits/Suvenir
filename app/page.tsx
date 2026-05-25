"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowUp, X } from "lucide-react";
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
  const [openedProductId, setOpenedProductId] = useState<string | null>(null);
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
  const openedProduct = catalog.products.find((product) => product.id === openedProductId);
  const allCategoriesSelected = selectedCategoryIds.length === catalog.categories.length;

  function toggleCategory(id: string) {
    setNotice("");
    setSelectedCategoryIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAllCategories() {
    setNotice("");
    setSelectedCategoryIds((current) => (current.length === catalog.categories.length ? [] : catalog.categories.map((category) => category.id)));
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
          <div className="flex items-center lg:justify-end">
            <PdfExport
              catalog={catalog}
              products={visibleProducts}
              onEmpty={() => setNotice("Выберите хотя бы одну категорию, чтобы сформировать PDF.")}
            />
          </div>
        </header>

        <div className="rounded-lg bg-white/55 p-4 shadow-soft">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleAllCategories}
              className={`mr-2 border-b-2 px-1 py-2 text-sm font-bold transition ${
                allCategoriesSelected ? "border-brand-700 text-brand-700" : "border-transparent text-[#42644d] hover:border-brand-300"
              }`}
            >
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
                    : "border-brand-300 bg-white text-brand-700 hover:bg-brand-50"
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
            <ProductCard key={product.id} product={product} catalog={catalog} onOpen={setOpenedProductId} />
          ))}
        </section>
      </section>

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-5 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-brand-700 text-white shadow-soft transition hover:bg-brand-900"
        aria-label="Вернуться в начало"
      >
        <ArrowUp size={22} />
      </button>

      {openedProduct ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f7f8f3] p-4 sm:p-6">
          <div className="mx-auto flex min-h-full max-w-6xl flex-col">
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => setOpenedProductId(null)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#42644d] shadow-soft hover:bg-brand-50"
                aria-label="Закрыть"
              >
                <X size={22} />
              </button>
            </div>
            <div className="flex flex-1 items-center justify-center">
              <div className="w-full">
                <ProductCard product={openedProduct} catalog={catalog} compact />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
