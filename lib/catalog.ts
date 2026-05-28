import type { CatalogData, CatalogValidationIssue, Product } from "@/lib/types";

export const cardSizeLabels: Record<Product["cardSize"], string> = {
  "large-horizontal": "Большой горизонтальный",
  "large-vertical": "Большой вертикальный",
  "large-square": "Большой квадратный",
  "medium-horizontal": "Средний горизонтальный",
  "medium-vertical": "Средний вертикальный",
  "medium-square": "Средний квадратный",
  "small-horizontal": "Маленький горизонтальный",
  "small-vertical": "Маленький вертикальный",
  "small-square": "Маленький квадратный"
};

export const cardSizeGridClass: Record<Product["cardSize"], string> = {
  "large-horizontal": "md:col-span-2",
  "large-vertical": "",
  "large-square": "md:col-span-2",
  "medium-horizontal": "md:col-span-2",
  "medium-vertical": "",
  "medium-square": "",
  "small-horizontal": "",
  "small-vertical": "",
  "small-square": ""
};

export const requiredProductFields: Array<keyof Product> = [
  "sectionId",
  "title",
  "description",
  "cardSize",
  "sku",
  "image",
  "backgroundColorId"
];

export function sortCatalog(data: CatalogData) {
  return {
    ...data,
    categories: [...data.categories].sort((a, b) => a.order - b.order),
    clothingSizes: [...data.clothingSizes].sort((a, b) => a.order - b.order),
    materials: [...data.materials].sort((a, b) => a.order - b.order),
    brandingMethods: [...(data.brandingMethods ?? [])].sort((a, b) => a.order - b.order),
    products: [...data.products].sort((a, b) => {
      if (a.sectionId === b.sectionId) return a.order - b.order;
      const categoryA = data.categories.find((item) => item.id === a.sectionId)?.order ?? 0;
      const categoryB = data.categories.find((item) => item.id === b.sectionId)?.order ?? 0;
      return categoryA - categoryB;
    })
  };
}

function catalogUpdatedAtTime(data: CatalogData) {
  const time = Date.parse(data.updatedAt);
  return Number.isFinite(time) ? time : 0;
}

export function isCatalogAtLeastAsFresh(next: CatalogData, current: CatalogData) {
  if (next.version !== current.version) return next.version >= current.version;
  return catalogUpdatedAtTime(next) >= catalogUpdatedAtTime(current);
}

export function formatProductSku(categoryIndex: number, productIndex: number) {
  return `${String(categoryIndex + 1).padStart(2, "0")}.${String(productIndex + 1).padStart(2, "0")}`;
}

export function normalizeProductOrder(data: CatalogData): CatalogData {
  const categories = [...data.categories].sort((a, b) => a.order - b.order);
  const productsByCategory = new Map<string, Product[]>();

  categories.forEach((category) => {
    productsByCategory.set(
      category.id,
      data.products.filter((product) => product.sectionId === category.id).sort((a, b) => a.order - b.order)
    );
  });

  const knownCategoryIds = new Set(categories.map((category) => category.id));
  const orphanProducts = data.products.filter((product) => !knownCategoryIds.has(product.sectionId)).sort((a, b) => a.order - b.order);
  const products = categories.flatMap((category, categoryIndex) =>
    (productsByCategory.get(category.id) ?? []).map((product, productIndex) => ({
      ...product,
      order: productIndex + 1,
      sku: formatProductSku(categoryIndex, productIndex)
    }))
  );

  return { ...data, products: [...products, ...orphanProducts] };
}

export function validateCatalog(data: CatalogData): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = [];
  const categoryIds = new Set(data.categories.map((item) => item.id));
  const backgrounds = new Set(data.cardBackgroundColors.map((item) => item.id));
  const skuBySection = new Map<string, Set<string>>();

  data.products.forEach((product) => {
    requiredProductFields.forEach((field) => {
      const value = product[field];
      if (!value || (typeof value === "string" && !value.trim())) {
        issues.push({ productId: product.id, field, message: "Заполните обязательное поле" });
      }
    });

    if (!categoryIds.has(product.sectionId)) {
      issues.push({ productId: product.id, field: "sectionId", message: "Выберите существующий раздел" });
    }

    if (!backgrounds.has(product.backgroundColorId)) {
      issues.push({ productId: product.id, field: "backgroundColorId", message: "Выберите фон карточки" });
    }

    const sectionSku = skuBySection.get(product.sectionId) ?? new Set<string>();
    if (sectionSku.has(product.sku.trim().toLowerCase())) {
      issues.push({ productId: product.id, field: "sku", message: "Номер позиции должен быть уникальным внутри раздела" });
    }
    sectionSku.add(product.sku.trim().toLowerCase());
    skuBySection.set(product.sectionId, sectionSku);
  });

  return issues;
}

export function createEmptyProduct(sectionId: string, order: number, backgroundColorId: string): Product {
  return {
    id: crypto.randomUUID(),
    sectionId,
    order,
    sku: "",
    title: "",
    description: "",
    image: "",
    corporateColorIds: [],
    clothingSizeIds: [],
    materialIds: [],
    brandingMethodIds: [],
    cardSize: "medium-square",
    backgroundColorId
  };
}

export function hasUnpublishedChanges(draft: CatalogData, published: CatalogData) {
  const normalize = (value: CatalogData) => JSON.stringify({ ...value, updatedAt: "" });
  return normalize(draft) !== normalize(published);
}
