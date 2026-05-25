"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  GripVertical,
  ImagePlus,
  KeyRound,
  LayoutGrid,
  LogOut,
  Plus,
  Save,
  Shield,
  Trash2,
  Upload,
  Users,
  X
} from "lucide-react";
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import draftJson from "@/data/catalog.draft.json";
import publishedJson from "@/data/catalog.published.json";
import usersJson from "@/data/users.json";
import { ProductCard } from "@/components/ProductCard";
import { cardSizeLabels, createEmptyProduct, hasUnpublishedChanges, normalizeProductOrder, sortCatalog, validateCatalog } from "@/lib/catalog";
import { createUser, verifyPassword } from "@/lib/auth";
import { commitJson, createGitHubConfig, fetchRepositoryJson, repositoryConfig } from "@/lib/github";
import type {
  BrandingMethod,
  CardBackgroundColor,
  CatalogData,
  Category,
  ClothingSize,
  CorporateColor,
  Material,
  Product,
  User
} from "@/lib/types";

const initialDraft = sortCatalog(draftJson as CatalogData);
const initialPublished = sortCatalog(publishedJson as CatalogData);
const initialUsers = usersJson as User[];

type AdminSection = "access" | "products" | "categories" | "corporateColors" | "clothingSizes" | "materials" | "brandingMethods" | "cardBackgroundColors" | "github";
type DirectoryKind = Exclude<AdminSection, "access" | "products" | "github">;

const catalogSections: Array<{ id: AdminSection; label: string }> = [
  { id: "products", label: "Сувенирная продукция" },
  { id: "categories", label: "Разделы каталога" },
  { id: "corporateColors", label: "Корпоративные цвета" },
  { id: "clothingSizes", label: "Размеры одежды" },
  { id: "materials", label: "Материалы" },
  { id: "brandingMethods", label: "Способы брендирования" },
  { id: "cardBackgroundColors", label: "Фоны карточек" },
  { id: "github", label: "GitHub storage" }
];

export default function AdminPage() {
  const [draft, setDraft] = useState<CatalogData>(initialDraft);
  const [published, setPublished] = useState<CatalogData>(initialPublished);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [section, setSection] = useState<AdminSection>("products");
  const [toast, setToast] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchRepositoryJson<CatalogData>("data/catalog.draft.json", initialDraft),
      fetchRepositoryJson<CatalogData>("data/catalog.published.json", initialPublished),
      fetchRepositoryJson<User[]>("data/users.json", initialUsers)
    ])
      .then(([remoteDraft, remotePublished, remoteUsers]) => {
        setDraft(sortCatalog(remoteDraft));
        setPublished(sortCatalog(remotePublished));
        setUsers(remoteUsers);
      })
      .finally(() => setLoading(false));
  }, []);

  const validationIssues = useMemo(() => validateCatalog(draft), [draft]);
  const unpublished = hasUnpublishedChanges(draft, published);

  function persistDraft(nextDraft: CatalogData) {
    const stamped = sortCatalog(normalizeProductOrder({ ...nextDraft, updatedAt: new Date().toISOString(), version: nextDraft.version + 1 }));
    setDraft(stamped);
  }

  async function persistUsers(nextUsers: User[]) {
    if (!token.trim()) {
      setToast("Введите GitHub token, чтобы сохранить пользователей в репозитории.");
      return false;
    }
    try {
      await commitJson(createGitHubConfig(token.trim()), "data/users.json", nextUsers, "Обновить пользователей каталога");
      setUsers(nextUsers);
      setToast("Пользователи сохранены в GitHub.");
      return true;
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Не удалось сохранить пользователей в GitHub.");
      return false;
    }
  }

  async function saveDraft() {
    if (!token.trim()) {
      setToast("Введите GitHub token, чтобы сохранить черновик в репозитории.");
      return;
    }
    try {
      const nextDraft = sortCatalog(normalizeProductOrder(draft));
      await commitJson(createGitHubConfig(token.trim()), "data/catalog.draft.json", nextDraft, "Обновить черновик каталога");
      setDraft(nextDraft);
      setToast("Черновик сохранён в GitHub.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Не удалось сохранить черновик в GitHub.");
    }
  }

  async function publish() {
    if (validationIssues.length) {
      setToast("Нельзя опубликовать каталог: исправьте подсвеченные позиции в разделе «Сувенирная продукция».");
      setSection("products");
      return;
    }
    if (!token.trim()) {
      setToast("Введите GitHub token, чтобы опубликовать каталог в репозитории.");
      return;
    }
    try {
      const nextPublished = sortCatalog(normalizeProductOrder({ ...draft, updatedAt: new Date().toISOString(), version: draft.version + 1 }));
      await commitJson(createGitHubConfig(token.trim()), "data/catalog.draft.json", nextPublished, "Обновить черновик каталога");
      await commitJson(createGitHubConfig(token.trim()), "data/catalog.published.json", nextPublished, "Опубликовать каталог");
      setDraft(nextPublished);
      setPublished(nextPublished);
      setToast("Каталог опубликован в GitHub. GitHub Pages обновится после сборки.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Не удалось опубликовать каталог в GitHub.");
    }
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f7f8f3] px-4 text-lg font-bold text-brand-900">Загружаем данные из GitHub...</main>;
  }

  if (!currentUser) {
    return (
      <LoginScreen
        users={users}
        token={token}
        onToken={setToken}
        onUsers={persistUsers}
        onLogin={(user) => {
          setCurrentUser(user);
        }}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8f3] text-brand-900">
      <div className="grid min-h-screen lg:h-screen lg:grid-cols-[300px_1fr] lg:overflow-hidden">
        <aside className="border-r border-brand-100 bg-white p-5 lg:h-screen lg:overflow-y-auto">
          <h1 className="mb-5 text-2xl font-bold">Сувенирный каталог</h1>

          <div className="relative mb-4">
            <button
              type="button"
              onClick={() => setProfileOpen((value) => !value)}
              className="flex w-full items-center justify-between rounded-lg bg-brand-50 px-4 py-3 text-left transition hover:bg-[#e8f4ea]"
            >
              <span>
                <span className="block font-bold">{currentUser.login}</span>
                <span className="block text-sm text-[#42644d]">Роль: {currentUser.role === "owner" ? "owner" : "editor"}</span>
              </span>
              <ChevronDown size={18} className={profileOpen ? "rotate-180 transition" : "transition"} />
            </button>
            {profileOpen ? (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-lg border border-brand-100 bg-white p-2 shadow-soft">
                {currentUser.role === "owner" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSection("access");
                      setProfileOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#42644d] hover:bg-brand-50"
                  >
                    <Users size={17} />
                    Управление доступом
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentUser(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#42644d] hover:bg-brand-50"
                >
                  <LogOut size={17} />
                  Выйти
                </button>
              </div>
            ) : null}
          </div>

          <nav className="space-y-2">
            <button
              type="button"
              onClick={() => setSection("products")}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left font-semibold ${section === "products" ? "bg-brand-700 text-white" : "hover:bg-brand-50"}`}
            >
              <LayoutGrid size={19} />
              Сувенирная продукция
            </button>

            <div className="my-4 border-y border-brand-100 py-4">
              <div className="space-y-1">
                {catalogSections.filter((item) => item.id !== "products" && item.id !== "github").map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSection(item.id)}
                    className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold ${
                      section === item.id ? "bg-brand-50 text-brand-700" : "text-[#42644d] hover:bg-[#f7f8f3]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {catalogSections.filter((item) => item.id === "github").map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold ${
                    section === item.id ? "bg-brand-50 text-brand-700" : "text-[#42644d] hover:bg-[#f7f8f3]"
                  }`}
                >
                  {item.label}
                </button>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 p-4 sm:p-6 lg:h-screen lg:overflow-y-auto lg:p-8">
          <header className="mb-6 flex flex-col gap-4 rounded-lg bg-white p-4 shadow-soft xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${unpublished ? "bg-amber-100 text-amber-800" : "bg-brand-50 text-brand-700"}`}>
                {unpublished ? "Есть неопубликованные изменения" : "Все изменения опубликованы"}
              </div>
              {validationIssues.length ? (
                <p className="mt-2 text-sm font-semibold text-red-700">
                  Есть проблемы в позициях: {validationIssues.length}. Откройте подсвеченные строки, чтобы увидеть пояснения.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={saveDraft} className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-4 py-2 font-semibold text-brand-700 hover:border-brand-500">
                <Save size={18} />
                Сохранить черновик
              </button>
              <button type="button" onClick={publish} className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-900">
                <Upload size={18} />
                Опубликовать
              </button>
            </div>
          </header>

          {toast ? <div className="mb-5 rounded-lg border border-brand-100 bg-white px-4 py-3 text-sm font-semibold text-brand-700">{toast}</div> : null}

          {section === "access" && currentUser.role === "owner" ? (
            <AccessAdmin users={users} currentUser={currentUser} onUsers={persistUsers} />
          ) : section === "products" ? (
            <ProductsAdmin draft={draft} onDraft={persistDraft} issues={validationIssues} />
          ) : section === "github" ? (
            <GitHubPanel token={token} onToken={setToken} />
          ) : (
            <DirectoryPanel kind={section as DirectoryKind} draft={draft} onDraft={persistDraft} />
          )}
        </section>
      </div>
    </main>
  );
}

function LoginScreen({
  users,
  token,
  onToken,
  onUsers,
  onLogin
}: {
  users: User[];
  token: string;
  onToken: (token: string) => void;
  onUsers: (users: User[]) => Promise<boolean>;
  onLogin: (user: User) => void;
}) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const isFirstUser = users.length === 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!login.trim() || password.length < 6) {
      setMessage("Введите логин и пароль не короче 6 символов.");
      return;
    }
    if (isFirstUser) {
      if (!token.trim()) {
        setMessage("Введите GitHub token, чтобы создать первого owner в репозитории.");
        return;
      }
      const owner = await createUser(login.trim(), password, "owner");
      if (await onUsers([owner])) onLogin(owner);
      return;
    }
    const user = users.find((item) => item.login.toLowerCase() === login.trim().toLowerCase());
    if (!user || !(await verifyPassword(password, user))) {
      setMessage("Неверный логин или пароль.");
      return;
    }
    onLogin(user);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f3] px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg bg-white p-7 shadow-soft">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <KeyRound />
        </div>
        <h1 className="text-3xl font-bold text-brand-900">{isFirstUser ? "Создание owner" : "Вход в панель управления"}</h1>
        <p className="mt-3 text-sm leading-6 text-[#42644d]">
          {isFirstUser ? "Первый зарегистрированный пользователь станет главным администратором и будет сохранён в GitHub." : "Введите логин и пароль сотрудника."}
        </p>
        <label className="mt-6 block text-sm font-bold">
          GitHub token {isFirstUser ? "*" : ""}
          <input
            value={token}
            onChange={(event) => onToken(event.target.value)}
            type="password"
            className="mt-2 w-full rounded-lg border border-brand-100 px-4 py-3 outline-none focus:border-brand-500"
            placeholder="Token с правом Contents: Read and write"
          />
        </label>
        <label className="mt-6 block text-sm font-bold">
          Логин *
          <input value={login} onChange={(event) => setLogin(event.target.value)} className="mt-2 w-full rounded-lg border border-brand-100 px-4 py-3 outline-none focus:border-brand-500" />
        </label>
        <label className="mt-4 block text-sm font-bold">
          Пароль *
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="mt-2 w-full rounded-lg border border-brand-100 px-4 py-3 outline-none focus:border-brand-500" />
        </label>
        {message ? <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{message}</div> : null}
        <button type="submit" className="mt-6 w-full rounded-full bg-brand-700 px-5 py-3 font-bold text-white hover:bg-brand-900">
          {isFirstUser ? "Создать owner" : "Войти"}
        </button>
      </form>
    </main>
  );
}

function ProductsAdmin({ draft, onDraft, issues }: { draft: CatalogData; onDraft: (draft: CatalogData) => void; issues: ReturnType<typeof validateCatalog> }) {
  const sensors = useSensors(useSensor(PointerSensor));
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState(draft.categories[0]?.id ?? "");
  const activeCategory = draft.categories.find((category) => category.id === activeCategoryId) ?? draft.categories[0];
  const visibleProducts = activeCategory ? draft.products.filter((product) => product.sectionId === activeCategory.id) : [];

  useEffect(() => {
    if (!draft.categories.some((category) => category.id === activeCategoryId)) {
      setActiveCategoryId(draft.categories[0]?.id ?? "");
    }
  }, [activeCategoryId, draft.categories]);

  function productIssues(productId: string) {
    return issues.filter((issue) => issue.productId === productId);
  }

  function addProduct() {
    const product = createEmptyProduct(activeCategory?.id ?? draft.categories[0]?.id ?? "", visibleProducts.length + 1, draft.cardBackgroundColors[0]?.id ?? "");
    setEditingProduct(product);
  }

  function saveProduct(product: Product) {
    const exists = draft.products.some((item) => item.id === product.id);
    const products = exists ? draft.products.map((item) => (item.id === product.id ? product : item)) : [...draft.products, product];
    onDraft({ ...draft, products });
    setEditingProduct(null);
  }

  function deleteProduct(id: string) {
    if (!confirm("Удалить позицию сувенирной продукции?")) return;
    onDraft({ ...draft, products: draft.products.filter((product) => product.id !== id) });
  }

  function onProductsDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    if (!activeCategory) return;
    const categoryProducts = visibleProducts;
    const oldIndex = categoryProducts.findIndex((item) => item.id === event.active.id);
    const newIndex = categoryProducts.findIndex((item) => item.id === event.over?.id);
    const movedCategoryProducts = arrayMove(categoryProducts, oldIndex, newIndex).map((product, index) => ({ ...product, order: index + 1 }));
    const movedIds = new Set(movedCategoryProducts.map((product) => product.id));
    onDraft({ ...draft, products: [...draft.products.filter((product) => !movedIds.has(product.id)), ...movedCategoryProducts] });
  }

  return (
    <section className="rounded-lg bg-white p-5 shadow-soft">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Сувенирная продукция</h2>
          <p className="mt-1 text-sm text-[#42644d]">Выберите раздел и перетаскивайте позиции внутри него.</p>
        </div>
        <button type="button" onClick={addProduct} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white">
          <Plus size={17} />
          Добавить позицию
        </button>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto border-b border-brand-100 pb-2">
        {draft.categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActiveCategoryId(category.id)}
            className={`whitespace-nowrap rounded-t-lg px-4 py-2 text-sm font-bold ${
              activeCategory?.id === category.id ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-700 hover:bg-[#e8f4ea]"
            }`}
          >
            {category.title}
          </button>
        ))}
      </div>

      <DndContext sensors={sensors} onDragEnd={onProductsDragEnd}>
        <SortableContext items={visibleProducts.map((product) => product.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {visibleProducts.map((product) => {
              const currentIssues = productIssues(product.id);
              return (
                <SortableRow key={product.id} id={product.id} danger={currentIssues.length > 0}>
                  <button type="button" onClick={() => setEditingProduct(product)} className="min-w-0 flex-1 rounded-lg px-3 py-2 text-left hover:bg-white/70">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">№ {product.sku || "—"}</span>
                      <span className="truncate font-semibold">{product.title || "Новая позиция"}</span>
                    </div>
                    <div className="mt-1 text-xs text-[#42644d]">{draft.categories.find((category) => category.id === product.sectionId)?.title || "Раздел не выбран"}</div>
                    {currentIssues.length ? (
                      <div className="mt-2 text-xs font-semibold text-red-700">{currentIssues.map((issue) => issue.message).join("; ")}</div>
                    ) : null}
                  </button>
                  <button type="button" onClick={() => deleteProduct(product.id)} className="rounded-full p-2 text-red-700 hover:bg-red-50" aria-label="Удалить позицию">
                    <Trash2 size={17} />
                  </button>
                </SortableRow>
              );
            })}
            {!visibleProducts.length ? (
              <div className="rounded-lg border border-dashed border-brand-100 bg-brand-50 px-4 py-8 text-center text-sm font-semibold text-[#42644d]">
                В этом разделе пока нет позиций.
              </div>
            ) : null}
          </div>
        </SortableContext>
      </DndContext>

      {editingProduct ? (
        <ProductModal
          product={editingProduct}
          draft={draft}
          issues={productIssues(editingProduct.id)}
          onClose={() => setEditingProduct(null)}
          onProduct={setEditingProduct}
          onSave={saveProduct}
        />
      ) : null}
    </section>
  );
}

function ProductModal({
  product,
  draft,
  issues,
  onClose,
  onProduct,
  onSave
}: {
  product: Product;
  draft: CatalogData;
  issues: ReturnType<typeof validateCatalog>;
  onClose: () => void;
  onProduct: (product: Product) => void;
  onSave: (product: Product) => void;
}) {
  const [tab, setTab] = useState<"data" | "preview">("data");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/35 p-4">
      <section className="my-6 w-full max-w-6xl rounded-lg bg-white shadow-soft">
        <header className="flex items-center justify-between gap-4 border-b border-brand-100 p-5">
          <div>
            <h2 className="text-2xl font-bold">{product.title || "Новая позиция"}</h2>
            {issues.length ? <p className="mt-1 text-sm font-semibold text-red-700">Есть ошибки: {issues.map((issue) => issue.message).join("; ")}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-[#42644d] hover:bg-brand-50" aria-label="Закрыть">
            <X size={22} />
          </button>
        </header>
        <div className="flex border-b border-brand-100 px-5">
          <button type="button" onClick={() => setTab("data")} className={`px-4 py-3 font-bold ${tab === "data" ? "border-b-2 border-brand-700 text-brand-700" : "text-[#42644d]"}`}>
            Данные
          </button>
          <button type="button" onClick={() => setTab("preview")} className={`px-4 py-3 font-bold ${tab === "preview" ? "border-b-2 border-brand-700 text-brand-700" : "text-[#42644d]"}`}>
            Превью
          </button>
        </div>
        <div className="p-5">
          {tab === "data" ? <ProductForm product={product} draft={draft} onProduct={onProduct} issues={issues} /> : <ProductCard product={product} catalog={draft} compact />}
        </div>
        <footer className="flex justify-end gap-2 border-t border-brand-100 p-5">
          <button type="button" onClick={onClose} className="rounded-full border border-brand-100 px-5 py-2 font-semibold text-[#42644d] hover:border-brand-500">
            Отмена
          </button>
          <button type="button" onClick={() => onSave(product)} className="rounded-full bg-brand-700 px-5 py-2 font-bold text-white hover:bg-brand-900">
            Сохранить позицию
          </button>
        </footer>
      </section>
    </div>
  );
}

function SortableRow({ id, danger, children }: { id: string; danger?: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg border p-1 ${danger ? "border-red-200 bg-red-50" : "border-brand-100 bg-white"}`}
    >
      <button type="button" className="cursor-grab rounded p-2 text-[#42644d]" {...attributes} {...listeners} aria-label="Перетащить">
        <GripVertical size={17} />
      </button>
      {children}
    </div>
  );
}

function ProductForm({ product, draft, onProduct, issues }: { product: Product; draft: CatalogData; onProduct: (product: Product) => void; issues: ReturnType<typeof validateCatalog> }) {
  const issueText = new Map(issues.map((issue) => [issue.field, issue.message]));
  const set = <K extends keyof Product>(field: K, value: Product[K]) => onProduct({ ...product, [field]: value });

  async function uploadImage(file?: File) {
    if (!file) return;
    if (file.type !== "image/png") {
      alert("Загрузите PNG-файл с прозрачным фоном.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    set("image", dataUrl);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Field label="Раздел *" error={issueText.get("sectionId")}>
        <select value={product.sectionId} onChange={(event) => set("sectionId", event.target.value)} className="input">
          {draft.categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}
        </select>
      </Field>
      <Field label="Номер позиции">
        <div className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-bold text-brand-700">
          {product.sku || "Будет присвоен автоматически"}
        </div>
      </Field>
      <Field label="Наименование *" error={issueText.get("title")}>
        <input value={product.title} onChange={(event) => set("title", event.target.value)} className="input" />
      </Field>
      <Field label="Размер блока *" error={issueText.get("cardSize")}>
        <select value={product.cardSize} onChange={(event) => set("cardSize", event.target.value as Product["cardSize"])} className="input">
          {Object.entries(cardSizeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
      <Field label="Описание *" error={issueText.get("description")} wide>
        <textarea value={product.description} onChange={(event) => set("description", event.target.value)} className="input min-h-28" />
      </Field>
      <Field label="Фоновый цвет карточки *" error={issueText.get("backgroundColorId")}>
        <select value={product.backgroundColorId} onChange={(event) => set("backgroundColorId", event.target.value)} className="input">
          {draft.cardBackgroundColors.map((color) => <option key={color.id} value={color.id}>{color.title}</option>)}
        </select>
      </Field>
      <Field label="Картинка *" error={issueText.get("image")}>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-brand-100 px-4 py-3 text-sm font-semibold text-brand-700 hover:border-brand-500">
          <ImagePlus size={18} />
          Загрузить PNG
          <input type="file" accept="image/png" onChange={(event) => uploadImage(event.target.files?.[0])} className="hidden" />
        </label>
        <p className="mt-2 text-xs leading-5 text-[#42644d]">
          Формат PNG, прозрачный фон, минимум 1200 px по большей стороне, желательно до 2 МБ, объект вырезан без фона и с полями.
        </p>
      </Field>
      <Field label="Физический размер">
        <input value={product.physicalSize ?? ""} onChange={(event) => set("physicalSize", event.target.value)} className="input" />
      </Field>
      <Field label="Объём">
        <input value={product.volume ?? ""} onChange={(event) => set("volume", event.target.value)} className="input" />
      </Field>
      <CheckboxGroup title="Корпоративные цвета" values={draft.corporateColors} selected={product.corporateColorIds ?? []} onSelected={(ids) => set("corporateColorIds", ids)} />
      <CheckboxGroup title="Размер одежды" values={draft.clothingSizes} selected={product.clothingSizeIds ?? []} onSelected={(ids) => set("clothingSizeIds", ids)} />
      <CheckboxGroup title="Материалы" values={draft.materials} selected={product.materialIds ?? []} onSelected={(ids) => set("materialIds", ids)} />
      <CheckboxGroup title="Способ брендирования" values={draft.brandingMethods ?? []} selected={product.brandingMethodIds ?? []} onSelected={(ids) => set("brandingMethodIds", ids)} />
    </div>
  );
}

function Field({ label, error, wide, children }: { label: string; error?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block text-sm font-bold ${wide ? "lg:col-span-2" : ""}`}>
      {label}
      <div className="mt-2">{children}</div>
      {error ? <div className="mt-1 text-xs font-semibold text-red-700">{error}</div> : null}
    </label>
  );
}

function CheckboxGroup({ title, values, selected, onSelected }: { title: string; values: Array<{ id: string; title: string }>; selected: string[]; onSelected: (ids: string[]) => void }) {
  return (
    <div className="lg:col-span-2">
      <div className="mb-2 text-sm font-bold">{title}</div>
      <div className="flex flex-wrap gap-2">
        {values.map((item) => (
          <label key={item.id} className={`cursor-pointer rounded-full border px-3 py-2 text-sm font-semibold ${selected.includes(item.id) ? "border-brand-700 bg-brand-50 text-brand-700" : "border-brand-100 bg-white text-[#42644d]"}`}>
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => onSelected(selected.includes(item.id) ? selected.filter((id) => id !== item.id) : [...selected, item.id])}
              className="sr-only"
            />
            {item.title}
          </label>
        ))}
      </div>
    </div>
  );
}

function DirectoryPanel({ kind, draft, onDraft }: { kind: DirectoryKind; draft: CatalogData; onDraft: (draft: CatalogData) => void }) {
  const sensors = useSensors(useSensor(PointerSensor));
  const labels: Record<DirectoryKind, string> = {
    categories: "Разделы каталога",
    corporateColors: "Корпоративные цвета",
    clothingSizes: "Размеры одежды",
    materials: "Материалы",
    brandingMethods: "Способы брендирования",
    cardBackgroundColors: "Фоны карточек"
  };
  const items = draft[kind] as Array<Category | CorporateColor | ClothingSize | Material | BrandingMethod | CardBackgroundColor>;

  function addItem() {
    const base = { id: crypto.randomUUID(), title: "Новый элемент" };
    const nextItem = kind === "corporateColors" || kind === "cardBackgroundColors" ? { ...base, hex: "#e7f0df" } : { ...base, order: items.length + 1 };
    onDraft({ ...draft, [kind]: [...items, nextItem] });
  }

  function updateItem(id: string, patch: Record<string, string>) {
    onDraft({ ...draft, [kind]: items.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  }

  function deleteItem(id: string) {
    if (!confirm("Удалить элемент справочника?")) return;
    onDraft({ ...draft, [kind]: items.filter((item) => item.id !== id) });
  }

  function onDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const oldIndex = items.findIndex((item) => item.id === event.active.id);
    const newIndex = items.findIndex((item) => item.id === event.over?.id);
    const moved = arrayMove(items, oldIndex, newIndex).map((item, index) => ({ ...item, order: index + 1 }));
    onDraft({ ...draft, [kind]: moved });
  }

  return (
    <section className="rounded-lg bg-white p-5 shadow-soft">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{labels[kind]}</h2>
        <button type="button" onClick={addItem} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-bold text-white">Добавить</button>
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item) => (
              <SortableRow key={item.id} id={item.id}>
                <input value={item.title} onChange={(event) => updateItem(item.id, { title: event.target.value })} className="min-w-0 flex-1 rounded-lg border border-brand-100 px-3 py-2 text-sm" />
                {"hex" in item ? <input type="color" value={item.hex} onChange={(event) => updateItem(item.id, { hex: event.target.value })} className="h-9 w-11" /> : null}
                <button type="button" onClick={() => deleteItem(item.id)} className="rounded-full p-2 text-red-700 hover:bg-red-50"><Trash2 size={16} /></button>
              </SortableRow>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}

function GitHubPanel({ token }: { token: string; onToken: (token: string) => void }) {
  return (
    <section className="max-w-3xl rounded-lg bg-white p-5 shadow-soft">
      <h2 className="text-2xl font-bold">GitHub</h2>
      <p className="mt-2 text-sm leading-6 text-[#42644d]">
        Данные читаются и сохраняются в репозитории {repositoryConfig.owner}/{repositoryConfig.repo}, ветка {repositoryConfig.branch}.
        Token нужен только для записи и хранится в памяти открытой страницы. Значение token не отображается в админке.
      </p>
      <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">
        {token.trim() ? "GitHub token введён при входе и готов для сохранения." : "GitHub token не введён. Выйдите и войдите снова с token, чтобы сохранять изменения."}
      </div>
    </section>
  );
}

function AccessAdmin({ users, currentUser, onUsers }: { users: User[]; currentUser: User; onUsers: (users: User[]) => Promise<boolean> }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function addUser(event: React.FormEvent) {
    event.preventDefault();
    if (currentUser.role !== "owner") return;
    if (!login.trim() || password.length < 6) {
      setMessage("Введите логин и пароль не короче 6 символов.");
      return;
    }
    if (users.some((user) => user.login.toLowerCase() === login.trim().toLowerCase())) {
      setMessage("Пользователь с таким логином уже есть.");
      return;
    }
    const user = await createUser(login.trim(), password, "editor");
    if (await onUsers([...users, user])) {
      setLogin("");
      setPassword("");
      setMessage("Сотрудник создан и сохранён в GitHub.");
    }
  }

  return (
    <section className="rounded-lg bg-white p-5 shadow-soft">
      <div className="mb-6 flex items-center gap-3">
        <Shield className="text-brand-700" />
        <h2 className="text-2xl font-bold">Управление доступом</h2>
      </div>
      <form onSubmit={addUser} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <input value={login} onChange={(event) => setLogin(event.target.value)} placeholder="Логин сотрудника" className="input" />
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Пароль" className="input" />
        <button type="submit" className="rounded-full bg-brand-700 px-5 py-3 font-bold text-white">Создать editor</button>
      </form>
      {message ? <div className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">{message}</div> : null}
      <div className="mt-6 overflow-hidden rounded-lg border border-brand-100">
        {users.map((user) => (
          <div key={user.id} className="grid gap-2 border-b border-brand-100 px-4 py-3 text-sm last:border-b-0 md:grid-cols-[1fr_140px_180px]">
            <b>{user.login}</b>
            <span>{user.role}</span>
            <span className="text-[#42644d]">{new Date(user.createdAt).toLocaleDateString("ru-RU")}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
