"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckSquare, Filter, Square, X } from "lucide-react";
import publishedCatalog from "@/data/catalog.published.json";
import { ProductCard } from "@/components/ProductCard";
import { PdfExport } from "@/components/PdfExport";
import { sortCatalog } from "@/lib/catalog";
import type { CatalogData } from "@/lib/types";

const fallbackCatalog = sortCatalog(publishedCatalog as CatalogData);

export default function CatalogPage() {
  const [catalog, setCatalog] = useState<CatalogData>(fallbackCatalog);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const localPublished = localStorage.getItem("suvenir:published");
    if (localPublished) {
      setCatalog(sortCatalog(JSON.parse(localPublished) as CatalogData));
    }
  }, []);

  const visibleProducts = useMemo(() => {
    if (activeCategory === "all") return catalog.products;
    return catalog.products.filter((product) => product.sectionId === activeCategory);
  }, [activeCategory, catalog.products]);

  const selectedProducts = catalog.products.filter((product) => selectedIds.includes(product.id));

  function toggleProduct(id: string) {
    setNotice("");
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function selectVisible() {
    setNotice("");
    setSelectedIds((current) => Array.from(new Set([...current, ...visibleProducts.map((item) => item.id)])));
  }

  function clearSelection() {
    setNotice("");
    setSelectedIds([]);
  }

  return (
    <main className="min-h-screen bg-[#f7f8f3]">
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-6 rounded-lg bg-white/60 p-5 shadow-soft lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Подарки для клиентов и команды</p>
            <h1 className="text-4xl font-bold leading-tight text-brand-900 sm:text-5xl">Каталог сувенирной продукции</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#42644d]">
              Выберите позиции для клиентской подборки и скачайте аккуратный PDF с карточками товаров.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
            <button
              type="button"
              onClick={selectVisible}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-100 bg-white px-4 py-3 text-sm font-semibold text-brand-700 transition hover:border-brand-500"
            >
              <CheckSquare size={18} />
              Выбрать все с учётом фильтров
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-100 bg-white px-4 py-3 text-sm font-semibold text-[#42644d] transition hover:border-brand-500"
            >
              <X size={18} />
              Снять выбор
            </button>
            <PdfExport
              catalog={catalog}
              products={selectedProducts}
              onEmpty={() => setNotice("Выберите хотя бы одну позицию, чтобы сформировать PDF.")}
            />
          </div>
        </header>

        <div className="flex flex-col gap-4 rounded-lg bg-white/55 p-4 shadow-soft lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-900">
            <Filter size={18} />
            Разделы
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeCategory === "all" ? "bg-brand-700 text-white" : "bg-white text-brand-700 hover:bg-brand-50"
              }`}
            >
              Все
            </button>
            {catalog.categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeCategory === category.id ? "bg-brand-700 text-white" : "bg-white text-brand-700 hover:bg-brand-50"
                }`}
              >
                {category.title}
              </button>
            ))}
          </div>
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#42644d]">
            {selectedIds.length ? <CheckSquare size={18} /> : <Square size={18} />}
            Выбрано: {selectedIds.length}
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
