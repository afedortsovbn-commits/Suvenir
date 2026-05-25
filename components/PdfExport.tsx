"use client";

import { Download } from "lucide-react";
import type { CatalogData, Product } from "@/lib/types";
import { publicAsset } from "@/lib/paths";

type PdfExportProps = {
  catalog: CatalogData;
  products: Product[];
  disabled?: boolean;
  onEmpty: () => void;
};

const pageWidth = 794;
const pageHeight = 1123;
const pagePadding = 46;
const gap = 18;
const cardWidth = 332;
const cardHeight = 318;

export function PdfExport({ catalog, products, disabled, onEmpty }: PdfExportProps) {
  async function downloadPdf() {
    if (!products.length) {
      onEmpty();
      return;
    }

    const [{ jsPDF }, html2canvasModule] = await Promise.all([import("jspdf"), import("html2canvas")]);
    const html2canvas = html2canvasModule.default;
    const wrapper = buildPdfDom(catalog, products);
    document.body.appendChild(wrapper);

    try {
      await waitForImages(wrapper);
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pages = Array.from(wrapper.querySelectorAll<HTMLElement>("[data-pdf-page]"));

      for (let index = 0; index < pages.length; index += 1) {
        const canvas = await html2canvas(pages[index], {
          scale: 2.5,
          backgroundColor: "#f7f8f3",
          width: pageWidth,
          height: pageHeight,
          windowWidth: pageWidth,
          useCORS: true
        });
        const image = canvas.toDataURL("image/png");
        if (index > 0) pdf.addPage();
        pdf.addImage(image, "PNG", 0, 0, 595.28, 841.89);
      }

      pdf.save("suvenir-catalog.pdf");
    } finally {
      wrapper.remove();
    }
  }

  return (
    <button
      type="button"
      onClick={downloadPdf}
      disabled={disabled}
      className="inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-brand-700 px-3 py-3 text-xs font-semibold text-white shadow-soft transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-45 sm:px-5 sm:text-sm"
    >
      <Download size={18} />
      Скачать PDF
    </button>
  );
}

function buildPdfDom(catalog: CatalogData, products: Product[]) {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;background:#f7f8f3;font-family:Arial,Helvetica,sans-serif;color:#153f25;";

  let page = createPage();
  wrapper.appendChild(page);
  let cursorY = pagePadding;

  const title = document.createElement("h1");
  title.textContent = "Каталог сувенирной продукции";
  title.style.cssText = "position:absolute;left:46px;right:46px;top:46px;margin:0;font-size:30px;line-height:1.12;color:#25713d;font-weight:800;";
  page.appendChild(title);
  cursorY += 60;

  const grouped = catalog.categories
    .map((category) => ({ category, products: products.filter((product) => product.sectionId === category.id) }))
    .filter((group) => group.products.length);

  for (const group of grouped) {
    const sectionHeight = 42;
    if (cursorY + sectionHeight + cardHeight > pageHeight - pagePadding) {
      page = createPage();
      wrapper.appendChild(page);
      cursorY = pagePadding;
    }

    const section = document.createElement("h2");
    section.textContent = group.category.title;
    section.style.cssText = `position:absolute;left:${pagePadding}px;top:${cursorY}px;margin:0;font-size:20px;line-height:1.2;color:#25713d;font-weight:800;`;
    page.appendChild(section);
    cursorY += sectionHeight;

    for (let index = 0; index < group.products.length; index += 2) {
      if (cursorY + cardHeight > pageHeight - pagePadding) {
        page = createPage();
        wrapper.appendChild(page);
        cursorY = pagePadding;
      }

      const row = group.products.slice(index, index + 2);
      row.forEach((product, column) => {
        const card = createCard(catalog, product);
        card.style.left = `${pagePadding + column * (cardWidth + gap)}px`;
        card.style.top = `${cursorY}px`;
        page.appendChild(card);
      });
      cursorY += cardHeight + gap;
    }
    cursorY += 8;
  }

  return wrapper;
}

function createPage() {
  const page = document.createElement("section");
  page.dataset.pdfPage = "true";
  page.style.cssText = `position:relative;width:${pageWidth}px;height:${pageHeight}px;overflow:hidden;background:#f7f8f3;`;
  return page;
}

function createCard(catalog: CatalogData, product: Product) {
  const background = catalog.cardBackgroundColors.find((item) => item.id === product.backgroundColorId)?.hex ?? "#e7f0df";
  const branding = (catalog.brandingMethods ?? []).filter((item) => product.brandingMethodIds?.includes(item.id));
  const colors = catalog.corporateColors.filter((item) => product.corporateColorIds?.includes(item.id));
  const sizes = catalog.clothingSizes.filter((item) => product.clothingSizeIds?.includes(item.id));
  const details = [product.physicalSize, product.volume, branding.map((item) => item.title).join(", ") || product.printType].filter(Boolean).slice(0, 2).join(" · ");

  const card = document.createElement("article");
  card.style.cssText = `position:absolute;width:${cardWidth}px;height:${cardHeight}px;border-radius:12px;background:${background};padding:18px;box-shadow:0 14px 34px rgba(38,88,55,.12);overflow:hidden;`;

  const img = document.createElement("img");
  img.src = publicAsset(product.image);
  img.alt = product.title;
  img.style.cssText = "position:absolute;left:22px;right:22px;top:16px;width:288px;height:132px;object-fit:contain;";
  card.appendChild(img);

  const title = document.createElement("h3");
  title.textContent = product.title || "Новая позиция";
  title.style.cssText = "position:absolute;left:18px;right:18px;top:164px;margin:0;font-size:16px;line-height:1.2;color:#153f25;font-weight:800;overflow-wrap:anywhere;word-break:break-word;max-height:42px;overflow:hidden;";
  card.appendChild(title);

  const description = document.createElement("p");
  description.textContent = product.description || "";
  description.style.cssText = "position:absolute;left:18px;right:18px;top:214px;margin:0;font-size:10.5px;line-height:1.35;color:#315541;max-height:48px;overflow:hidden;word-break:break-word;";
  card.appendChild(description);

  const meta = document.createElement("div");
  meta.style.cssText = "position:absolute;left:18px;right:74px;bottom:16px;display:flex;align-items:center;gap:6px;font-size:10px;color:#315541;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
  colors.slice(0, 4).forEach((color) => {
    const swatch = document.createElement("span");
    swatch.title = color.title;
    swatch.style.cssText = `display:inline-block;width:12px;height:12px;border-radius:999px;border:1px solid rgba(0,0,0,.14);background:${color.hex};flex:0 0 auto;`;
    meta.appendChild(swatch);
  });
  sizes.slice(0, 3).forEach((size) => {
    const pill = document.createElement("span");
    pill.textContent = size.title;
    pill.style.cssText = "display:inline-block;border-radius:999px;background:rgba(255,255,255,.65);padding:2px 6px;font-weight:700;color:#153f25;";
    meta.appendChild(pill);
  });
  if (details) {
    const detail = document.createElement("span");
    detail.textContent = details;
    detail.style.cssText = "min-width:0;overflow:hidden;text-overflow:ellipsis;";
    meta.appendChild(detail);
  }
  card.appendChild(meta);

  const sku = document.createElement("div");
  sku.textContent = `№ ${product.sku || "—"}`;
  sku.style.cssText = "position:absolute;right:16px;bottom:14px;border-radius:999px;background:rgba(255,255,255,.78);padding:5px 10px;font-size:13px;font-weight:800;color:#25713d;";
  card.appendChild(sku);

  return card;
}

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      });
    })
  );
}
