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

const canvasWidth = 1600;
const canvasHeight = 2262;
const pagePadding = 126;
const gap = 56;
const cardWidth = 646;
const cardHeight = 430;

export function PdfExport({ catalog, products, disabled, onEmpty }: PdfExportProps) {
  async function downloadPdf() {
    if (!products.length) {
      onEmpty();
      return;
    }

    const { jsPDF } = await import("jspdf");
    const pages = await buildPdfCanvases(catalog, products);
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

    pages.forEach((canvas, index) => {
      if (index > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.96), "JPEG", 0, 0, 595.28, 841.89);
    });

    pdf.save("suvenir-catalog.pdf");
  }

  return (
    <button
      type="button"
      onClick={downloadPdf}
      disabled={disabled}
      className="inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Download size={18} />
      Скачать PDF
    </button>
  );
}

async function buildPdfCanvases(catalog: CatalogData, products: Product[]) {
  const pages: HTMLCanvasElement[] = [];
  let canvas = createCanvasPage();
  const firstContext = canvas.getContext("2d");
  if (!firstContext) return pages;
  let ctx: CanvasRenderingContext2D = firstContext;
  pages.push(canvas);

  let y = drawTitle(ctx);

  const grouped = catalog.categories
    .map((category) => ({ category, products: products.filter((product) => product.sectionId === category.id) }))
    .filter((group) => group.products.length);

  for (const group of grouped) {
    if (y + 74 + cardHeight > canvasHeight - pagePadding) {
      canvas = createCanvasPage();
      const nextContext = canvas.getContext("2d");
      if (!nextContext) break;
      ctx = nextContext;
      pages.push(canvas);
      y = pagePadding;
    }

    drawText(ctx, group.category.title, pagePadding, y, {
      font: "700 46px Arial",
      color: "#25713d",
      maxWidth: canvasWidth - pagePadding * 2,
      lineHeight: 54,
      maxLines: 1
    });
    y += 82;

    for (let index = 0; index < group.products.length; index += 2) {
      if (y + cardHeight > canvasHeight - pagePadding) {
        canvas = createCanvasPage();
        const nextContext = canvas.getContext("2d");
        if (!nextContext) break;
        ctx = nextContext;
        pages.push(canvas);
        y = pagePadding;
      }

      const row = group.products.slice(index, index + 2);
      await Promise.all(
        row.map((product, column) => drawProductCard(ctx, catalog, product, pagePadding + column * (cardWidth + gap), y))
      );
      y += cardHeight + gap;
    }
    y += 22;
  }

  return pages;
}

function createCanvasPage() {
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#f7f8f3";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }
  return canvas;
}

function drawTitle(ctx: CanvasRenderingContext2D) {
  drawText(ctx, "Каталог сувенирной продукции", pagePadding, pagePadding, {
    font: "800 64px Arial",
    color: "#25713d",
    maxWidth: canvasWidth - pagePadding * 2,
    lineHeight: 72,
    maxLines: 2
  });
  return pagePadding + 140;
}

async function drawProductCard(ctx: CanvasRenderingContext2D, catalog: CatalogData, product: Product, x: number, y: number) {
  const background = catalog.cardBackgroundColors.find((item) => item.id === product.backgroundColorId)?.hex ?? "#e7f0df";
  const branding = (catalog.brandingMethods ?? []).filter((item) => product.brandingMethodIds?.includes(item.id));
  const colors = catalog.corporateColors.filter((item) => product.corporateColorIds?.includes(item.id));
  const sizes = catalog.clothingSizes.filter((item) => product.clothingSizeIds?.includes(item.id));
  const details = [product.physicalSize, product.volume, branding.map((item) => item.title).join(", ") || product.printType].filter(Boolean).slice(0, 2).join(" · ");

  roundRect(ctx, x, y, cardWidth, cardHeight, 28, background);

  const image = await loadImage(publicAsset(product.image));
  if (image) {
    drawImageContain(ctx, image, x + 44, y + 38, cardWidth - 88, 176);
  }

  drawText(ctx, product.title || "Новая позиция", x + 42, y + 242, {
    font: "800 33px Arial",
    color: "#153f25",
    maxWidth: cardWidth - 84,
    lineHeight: 38,
    maxLines: 2
  });

  drawText(ctx, product.description || "", x + 42, y + 322, {
    font: "400 21px Arial",
    color: "#315541",
    maxWidth: cardWidth - 84,
    lineHeight: 28,
    maxLines: 2
  });

  let metaX = x + 42;
  const metaY = y + cardHeight - 58;
  colors.slice(0, 4).forEach((color) => {
    ctx.beginPath();
    ctx.arc(metaX + 15, metaY + 15, 15, 0, Math.PI * 2);
    ctx.fillStyle = color.hex;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.18)";
    ctx.lineWidth = 2;
    ctx.stroke();
    metaX += 46;
  });

  const label = [...sizes.map((item) => item.title), details].filter(Boolean).join("   ");
  drawText(ctx, label, metaX, metaY + 7, {
    font: "400 19px Arial",
    color: "#315541",
    maxWidth: cardWidth - (metaX - x) - 156,
    lineHeight: 24,
    maxLines: 1
  });

  const skuText = `№ ${product.sku || "—"}`;
  ctx.font = "800 27px Arial";
  const skuWidth = Math.ceil(ctx.measureText(skuText).width) + 48;
  roundRect(ctx, x + cardWidth - skuWidth - 34, y + cardHeight - 76, skuWidth, 54, 999, "rgba(255,255,255,.82)");
  ctx.fillStyle = "#25713d";
  ctx.fillText(skuText, x + cardWidth - skuWidth - 10, y + cardHeight - 39);
}

function drawImageContain(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const ratio = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawnWidth = image.naturalWidth * ratio;
  const drawnHeight = image.naturalHeight * ratio;
  ctx.drawImage(image, x + (width - drawnWidth) / 2, y + (height - drawnHeight) / 2, drawnWidth, drawnHeight);
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: { font: string; color: string; maxWidth: number; lineHeight: number; maxLines: number }
) {
  ctx.font = options.font;
  ctx.fillStyle = options.color;
  const lines = wrapText(ctx, text, options.maxWidth).slice(0, options.maxLines);
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * options.lineHeight);
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
      return;
    }
    if (line) lines.push(line);
    line = word;
  });

  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: string) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}
