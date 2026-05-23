export type Role = "owner" | "editor";

export type CardSize =
  | "large-horizontal"
  | "large-vertical"
  | "large-square"
  | "medium-horizontal"
  | "medium-vertical"
  | "medium-square"
  | "small-horizontal"
  | "small-vertical"
  | "small-square";

export type User = {
  id: string;
  login: string;
  role: Role;
  passwordHash: string;
  salt: string;
  createdAt: string;
};

export type Product = {
  id: string;
  sectionId: string;
  order: number;
  sku: string;
  title: string;
  description: string;
  image: string;
  corporateColorIds?: string[];
  clothingSizeIds?: string[];
  physicalSize?: string;
  printType?: string;
  materialIds?: string[];
  volume?: string;
  cardSize: CardSize;
  backgroundColorId: string;
};

export type Category = {
  id: string;
  title: string;
  order: number;
};

export type CorporateColor = {
  id: string;
  title: string;
  hex: string;
};

export type ClothingSize = {
  id: string;
  title: string;
  order: number;
};

export type Material = {
  id: string;
  title: string;
  order: number;
};

export type CardBackgroundColor = {
  id: string;
  title: string;
  hex: string;
};

export type CatalogData = {
  version: number;
  updatedAt: string;
  categories: Category[];
  products: Product[];
  corporateColors: CorporateColor[];
  clothingSizes: ClothingSize[];
  materials: Material[];
  cardBackgroundColors: CardBackgroundColor[];
};

export type CatalogValidationIssue = {
  productId?: string;
  field: string;
  message: string;
};
