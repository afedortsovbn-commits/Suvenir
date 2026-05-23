"use client";

import clsx from "clsx";
import Image from "next/image";
import type { CatalogData, Product } from "@/lib/types";
import { cardSizeGridClass } from "@/lib/catalog";
import { publicAsset } from "@/lib/paths";

type ProductCardProps = {
  product: Product;
  catalog: CatalogData;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (id: string) => void;
  compact?: boolean;
};

export function ProductCard({ product, catalog, selectable, selected, onToggle, compact }: ProductCardProps) {
  const background = catalog.cardBackgroundColors.find((item) => item.id === product.backgroundColorId);
  const colors = catalog.corporateColors.filter((item) => product.corporateColorIds?.includes(item.id));
  const sizes = catalog.clothingSizes.filter((item) => product.clothingSizeIds?.includes(item.id));
  const materials = catalog.materials.filter((item) => product.materialIds?.includes(item.id));
  const brandingMethods = (catalog.brandingMethods ?? []).filter((item) => product.brandingMethodIds?.includes(item.id));

  return (
    <article
      className={clsx(
        "group relative flex min-h-[220px] flex-col overflow-hidden rounded-lg border border-white/80 p-4 shadow-soft transition",
        !compact && cardSizeGridClass[product.cardSize],
        selected && "ring-2 ring-brand-500"
      )}
      style={{ backgroundColor: background?.hex ?? "#e7f0df" }}
    >
      {selectable ? (
        <label className="absolute right-4 top-4 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/85 shadow-sm">
          <input
            aria-label={`Выбрать ${product.title}`}
            className="h-5 w-5 accent-brand-700"
            type="checkbox"
            checked={selected}
            onChange={() => onToggle?.(product.id)}
          />
        </label>
      ) : null}

      <div className="relative z-0 mb-2 flex min-h-[120px] flex-1 items-center justify-center">
        {product.image ? (
          <Image
            src={publicAsset(product.image)}
            alt={product.title || "Товар"}
            width={720}
            height={720}
            className="max-h-[260px] w-full object-contain drop-shadow-xl transition duration-300 group-hover:scale-[1.02]"
            priority={false}
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center rounded-lg bg-white/50 text-sm text-brand-700">
            Изображение не загружено
          </div>
        )}
      </div>

      <div className="relative z-10 mt-auto">
        <h3 className="product-title pr-8 font-bold leading-tight text-brand-900">{product.title || "Новый товар"}</h3>
        <p className="line-clamp-soft mt-2 text-sm leading-5 text-[#315541]">{product.description || "Описание появится после заполнения карточки."}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {colors.map((color) => (
            <span
              key={color.id}
              className="h-5 w-5 rounded-full border border-black/10 shadow-sm"
              style={{ backgroundColor: color.hex }}
              title={color.title}
            />
          ))}
          {sizes.map((size) => (
            <span key={size.id} className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-semibold text-brand-900">
              {size.title}
            </span>
          ))}
          {[...materials.slice(0, 1), ...brandingMethods.slice(0, 1)].map((item) => (
            <span key={item.id} className="rounded-full bg-white/55 px-2 py-1 text-[11px] text-[#315541]">
              {item.title}
            </span>
          ))}
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="text-xs leading-5 text-[#315541]">
            {[product.physicalSize, product.volume, brandingMethods.map((item) => item.title).join(", ") || product.printType].filter(Boolean).slice(0, 2).join(" · ")}
          </div>
          <div className="rounded-full bg-white/80 px-3 py-1 text-sm font-bold text-brand-700">№ {product.sku || "—"}</div>
        </div>
      </div>
    </article>
  );
}
