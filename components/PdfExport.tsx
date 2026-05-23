"use client";

import { Download } from "lucide-react";
import type { CatalogData, Product } from "@/lib/types";

type PdfExportProps = {
  catalog: CatalogData;
  products: Product[];
  disabled?: boolean;
  onEmpty: () => void;
};

export function PdfExport({ catalog, products, disabled, onEmpty }: PdfExportProps) {
  async function downloadPdf() {
    if (!products.length) {
      onEmpty();
      return;
    }

    const [{ jsPDF }] = await Promise.all([import("jspdf"), import("html2canvas")]);
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 14;
    const pageWidth = 210;
    const pageHeight = 297;
    const gap = 6;
    const cardWidth = (pageWidth - margin * 2 - gap) / 2;
    const cardHeight = 72;
    let y = margin;

    pdf.setFillColor(247, 248, 243);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");
    pdf.setTextColor(37, 113, 61);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.text("Каталог сувенирной продукции", margin, y + 4);
    y += 15;

    const grouped = catalog.categories
      .map((category) => ({ category, products: products.filter((product) => product.sectionId === category.id) }))
      .filter((group) => group.products.length);

    for (const group of grouped) {
      if (y + 18 > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(15);
      pdf.setTextColor(37, 113, 61);
      pdf.text(group.category.title, margin, y);
      y += 7;

      for (let index = 0; index < group.products.length; index += 2) {
        if (y + cardHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }

        const row = group.products.slice(index, index + 2);
        for (let col = 0; col < row.length; col += 1) {
          const product = row[col];
          const x = margin + col * (cardWidth + gap);
          const background = catalog.cardBackgroundColors.find((item) => item.id === product.backgroundColorId)?.hex ?? "#e7f0df";
          const color = hexToRgb(background);
          pdf.setFillColor(color.r, color.g, color.b);
          pdf.roundedRect(x, y, cardWidth, cardHeight, 3, 3, "F");

          try {
            const image = await imageToDataUrl(product.image);
            pdf.addImage(image, "PNG", x + 7, y + 5, cardWidth - 14, 30, undefined, "FAST");
          } catch {
            pdf.setTextColor(120, 140, 120);
            pdf.setFontSize(8);
            pdf.text("Изображение недоступно", x + 7, y + 20);
          }

          pdf.setTextColor(21, 63, 37);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.text(pdf.splitTextToSize(product.title, cardWidth - 14).slice(0, 2), x + 7, y + 43);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.setTextColor(49, 85, 65);
          pdf.text(pdf.splitTextToSize(product.description, cardWidth - 14).slice(0, 3), x + 7, y + 52);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(37, 113, 61);
          pdf.text(`№ ${product.sku}`, x + cardWidth - 18, y + cardHeight - 6);
        }
        y += cardHeight + gap;
      }
      y += 4;
    }

    pdf.save("suvenir-catalog.pdf");
  }

  return (
    <button
      type="button"
      onClick={downloadPdf}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Download size={18} />
      Скачать PDF
    </button>
  );
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = parseInt(normalized.length === 3 ? normalized.split("").map((char) => char + char).join("") : normalized, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

async function imageToDataUrl(src: string) {
  const response = await fetch(src);
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
