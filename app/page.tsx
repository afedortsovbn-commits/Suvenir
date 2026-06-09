"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUp, Shield, X } from "lucide-react";
import publishedCatalog from "@/data/catalog.published.json";
import { ProductCard } from "@/components/ProductCard";
import { PdfExport } from "@/components/PdfExport";
import { isCatalogAtLeastAsFresh, sortCatalog } from "@/lib/catalog";
import { fetchRepositoryJson } from "@/lib/github";
import { publicAsset } from "@/lib/paths";
import type { CatalogData } from "@/lib/types";

const fallbackCatalog = sortCatalog(publishedCatalog as CatalogData);

export default function CatalogPage() {
  const [catalog, setCatalog] = useState<CatalogData>(fallbackCatalog);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(() => fallbackCatalog.categories.map((category) => category.id));
  const [openedProductId, setOpenedProductId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    fetchRepositoryJson<CatalogData>("data/catalog.published.json", fallbackCatalog).then((data) => {
      const sorted = sortCatalog(data);
      if (!isCatalogAtLeastAsFresh(sorted, fallbackCatalog)) return;
      setCatalog(sorted);
      setSelectedCategoryIds((current) => {
        const categoryIds = sorted.categories.map((category) => category.id);
        const selected = current.filter((id) => categoryIds.includes(id));
        return current.length === fallbackCatalog.categories.length || !selected.length ? categoryIds : selected;
      });
    });
  }, []);

  useEffect(() => {
    function updateScrollTopVisibility() {
      setShowScrollTop(window.scrollY > 240);
    }

    updateScrollTopVisibility();
    window.addEventListener("scroll", updateScrollTopVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollTopVisibility);
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
            <div className="mb-5 flex items-center justify-between gap-4">
              <Image
                src={publicAsset("/brand/logo.png")}
                alt="Белоруснефть"
                width={727}
                height={166}
                className="h-auto w-full max-w-[260px] object-contain"
                priority
              />
              <Link
                href="/admin/"
                className="hidden shrink-0 items-center justify-center gap-2 rounded-full border border-brand-300 bg-white px-4 py-3 text-sm font-semibold text-brand-700 shadow-soft transition hover:border-brand-700 hover:bg-brand-50 lg:inline-flex"
              >
                <Shield size={18} />
                Админка
              </Link>
            </div>
            <h1 className="text-2xl font-bold leading-tight text-brand-900 sm:text-5xl">Каталог сувенирной продукции</h1>
          </div>
          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <PdfExport
              catalog={catalog}
              products={visibleProducts}
              onEmpty={() => setNotice("Выберите хотя бы одну категорию, чтобы сформировать PDF.")}
            />
            <Link
              href="/admin/"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-300 bg-white text-brand-700 shadow-soft transition hover:border-brand-700 hover:bg-brand-50 lg:hidden"
              aria-label="Открыть админку"
              title="Открыть админку"
            >
              <Shield size={20} />
            </Link>
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

      {showScrollTop ? (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-5 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-brand-700 text-white shadow-soft transition hover:bg-brand-900"
          aria-label="Вернуться в начало"
        >
          <ArrowUp size={22} />
        </button>
      ) : null}

      {openedProduct ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/30 p-4 backdrop-blur-sm sm:p-6">
          <div className="mx-auto flex min-h-full max-w-6xl items-center justify-center">
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setOpenedProductId(null)}
                className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#42644d] shadow-soft hover:bg-brand-50"
                aria-label="Закрыть"
              >
                <X size={22} />
              </button>
              <ProductCard product={openedProduct} catalog={catalog} compact />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
