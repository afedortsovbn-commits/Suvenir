"use client";

import { useEffect, useMemo, useState } from "react";
import {
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
  Users
} from "lucide-react";
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import draftJson from "@/data/catalog.draft.json";
import publishedJson from "@/data/catalog.published.json";
import usersJson from "@/data/users.json";
import { ProductCard } from "@/components/ProductCard";
import { cardSizeLabels, createEmptyProduct, hasUnpublishedChanges, sortCatalog, validateCatalog } from "@/lib/catalog";
import { createUser, verifyPassword } from "@/lib/auth";
import { commitJson, type GitHubConfig } from "@/lib/github";
import type {
  CardBackgroundColor,
  CatalogData,
  Category,
  ClothingSize,
  CorporateColor,
  Material,
  Product,
  User
} from "@/lib/types";

const storageKeys = {
  draft: "suvenir:draft",
  published: "suvenir:published",
  users: "suvenir:users",
  session: "suvenir:session",
  github: "suvenir:github"
};

const initialDraft = draftJson as CatalogData;
const initialPublished = publishedJson as CatalogData;
const initialUsers = usersJson as User[];

type AdminSection = "catalog" | "access";
type DirectoryKind = "categories" | "corporateColors" | "clothingSizes" | "materials" | "cardBackgroundColors";

export default function AdminPage() {
  const [draft, setDraft] = useState<CatalogData>(sortCatalog(initialDraft));
  const [published, setPublished] = useState<CatalogData>(sortCatalog(initialPublished));
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [section, setSection] = useState<AdminSection>("catalog");
  const [selectedProductId, setSelectedProductId] = useState(initialDraft.products[0]?.id ?? "");
  const [toast, setToast] = useState("");
  const [github, setGithub] = useState<GitHubConfig>({ owner: "", repo: "", branch: "main", token: "" });

  useEffect(() => {
    const localDraft = localStorage.getItem(storageKeys.draft);
    const localPublished = localStorage.getItem(storageKeys.published);
    const localUsers = localStorage.getItem(storageKeys.users);
    const session = localStorage.getItem(storageKeys.session);
    const localGithub = localStorage.getItem(storageKeys.github);
    if (localDraft) setDraft(sortCatalog(JSON.parse(localDraft) as CatalogData));
    if (localPublished) setPublished(sortCatalog(JSON.parse(localPublished) as CatalogData));
    if (localUsers) {
      const parsed = JSON.parse(localUsers) as User[];
      setUsers(parsed);
      if (session) setCurrentUser(parsed.find((user) => user.id === session) ?? null);
    } else if (session) {
      setCurrentUser(initialUsers.find((user) => user.id === session) ?? null);
    }
    if (localGithub) setGithub(JSON.parse(localGithub) as GitHubConfig);
  }, []);

  const validationIssues = useMemo(() => validateCatalog(draft), [draft]);
  const selectedProduct = draft.products.find((product) => product.id === selectedProductId) ?? draft.products[0];
  const unpublished = hasUnpublishedChanges(draft, published);

  function persistDraft(nextDraft: CatalogData) {
    const stamped = sortCatalog({ ...nextDraft, updatedAt: new Date().toISOString(), version: nextDraft.version + 1 });
    setDraft(stamped);
    localStorage.setItem(storageKeys.draft, JSON.stringify(stamped));
  }

  function persistUsers(nextUsers: User[]) {
    setUsers(nextUsers);
    localStorage.setItem(storageKeys.users, JSON.stringify(nextUsers));
  }

  function saveDraft() {
    localStorage.setItem(storageKeys.draft, JSON.stringify(draft));
    setToast("Черновик сохранён в браузере.");
  }

  async function publish() {
    if (validationIssues.length) {
      setToast("Нельзя опубликовать каталог: исправьте ошибки в товарах.");
      return;
    }
    const nextPublished = sortCatalog({ ...draft, updatedAt: new Date().toISOString(), version: draft.version + 1 });
    setPublished(nextPublished);
    localStorage.setItem(storageKeys.published, JSON.stringify(nextPublished));
    setToast("Каталог опубликован локально. Для GitHub нажмите «Сохранить в GitHub».");
  }

  async function saveToGitHub() {
    try {
      if (!github.owner || !github.repo || !github.branch || !github.token) {
        setToast("Заполните owner, repo, branch и token для GitHub.");
        return;
      }
      localStorage.setItem(storageKeys.github, JSON.stringify(github));
      await commitJson(github, "data/catalog.draft.json", draft, "Обновить черновик каталога");
      await commitJson(github, "data/catalog.published.json", published, "Опубликовать каталог");
      await commitJson(github, "data/users.json", users, "Обновить пользователей админки");
      setToast("JSON-файлы сохранены в GitHub. GitHub Pages обновится после сборки.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Не удалось сохранить изменения в GitHub.");
    }
  }

  if (!currentUser) {
    return <LoginScreen users={users} onUsers={persistUsers} onLogin={(user) => {
      setCurrentUser(user);
      localStorage.setItem(storageKeys.session, user.id);
    }} />;
  }

  return (
    <main className="min-h-screen bg-[#f7f8f3] text-brand-900">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-brand-100 bg-white p-5">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Админка</p>
            <h1 className="mt-2 text-2xl font-bold">Сувенирный каталог</h1>
          </div>
          <nav className="space-y-2">
            <button
              type="button"
              onClick={() => setSection("catalog")}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left font-semibold ${section === "catalog" ? "bg-brand-700 text-white" : "hover:bg-brand-50"}`}
            >
              <LayoutGrid size={19} />
              Настройка каталога
            </button>
            {currentUser.role === "owner" ? (
              <button
                type="button"
                onClick={() => setSection("access")}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left font-semibold ${section === "access" ? "bg-brand-700 text-white" : "hover:bg-brand-50"}`}
              >
                <Users size={19} />
                Управление доступом
              </button>
            ) : null}
          </nav>
          <div className="mt-8 rounded-lg bg-brand-50 p-4 text-sm leading-6">
            <div className="font-bold">{currentUser.login}</div>
            <div className="text-[#42644d]">Роль: {currentUser.role === "owner" ? "owner" : "editor"}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(storageKeys.session);
              setCurrentUser(null);
            }}
            className="mt-4 flex w-full items-center gap-2 rounded-lg border border-brand-100 px-4 py-3 font-semibold text-[#42644d] hover:border-brand-500"
          >
            <LogOut size={18} />
            Выйти
          </button>
        </aside>

        <section className="min-w-0 p-4 sm:p-6 lg:p-8">
          <header className="mb-6 flex flex-col gap-4 rounded-lg bg-white p-4 shadow-soft xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${unpublished ? "bg-amber-100 text-amber-800" : "bg-brand-50 text-brand-700"}`}>
                {unpublished ? "Есть неопубликованные изменения" : "Все изменения опубликованы"}
              </div>
              {validationIssues.length ? <p className="mt-2 text-sm font-semibold text-red-700">Ошибок в каталоге: {validationIssues.length}</p> : null}
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

          {section === "catalog" ? (
            <CatalogAdmin
              draft={draft}
              selectedProduct={selectedProduct}
              onDraft={persistDraft}
              onSelectProduct={setSelectedProductId}
              github={github}
              onGithub={setGithub}
              onSaveGitHub={saveToGitHub}
              issues={validationIssues}
            />
          ) : (
            <AccessAdmin users={users} currentUser={currentUser} onUsers={persistUsers} />
          )}
        </section>
      </div>
    </main>
  );
}

function LoginScreen({ users, onUsers, onLogin }: { users: User[]; onUsers: (users: User[]) => void; onLogin: (user: User) => void }) {
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
      const owner = await createUser(login.trim(), password, "owner");
      onUsers([owner]);
      onLogin(owner);
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
        <h1 className="text-3xl font-bold text-brand-900">{isFirstUser ? "Создание owner" : "Вход в админку"}</h1>
        <p className="mt-3 text-sm leading-6 text-[#42644d]">
          {isFirstUser ? "Первый зарегистрированный пользователь станет главным администратором." : "Введите логин и пароль сотрудника."}
        </p>
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

function CatalogAdmin(props: {
  draft: CatalogData;
  selectedProduct?: Product;
  onDraft: (draft: CatalogData) => void;
  onSelectProduct: (id: string) => void;
  github: GitHubConfig;
  onGithub: (config: GitHubConfig) => void;
  onSaveGitHub: () => void;
  issues: ReturnType<typeof validateCatalog>;
}) {
  const { draft, selectedProduct, onDraft, onSelectProduct, github, onGithub, onSaveGitHub, issues } = props;
  const sensors = useSensors(useSensor(PointerSensor));

  function updateProduct(product: Product) {
    onDraft({ ...draft, products: draft.products.map((item) => (item.id === product.id ? product : item)) });
  }

  function addProduct() {
    const firstCategory = draft.categories[0]?.id ?? "";
    const firstBackground = draft.cardBackgroundColors[0]?.id ?? "";
    const product = createEmptyProduct(firstCategory, draft.products.length + 1, firstBackground);
    onDraft({ ...draft, products: [...draft.products, product] });
    onSelectProduct(product.id);
  }

  function deleteProduct(id: string) {
    if (!confirm("Удалить товар из черновика?")) return;
    const nextProducts = draft.products.filter((product) => product.id !== id);
    onDraft({ ...draft, products: nextProducts });
    onSelectProduct(nextProducts[0]?.id ?? "");
  }

  function onProductsDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const oldIndex = draft.products.findIndex((item) => item.id === event.active.id);
    const newIndex = draft.products.findIndex((item) => item.id === event.over?.id);
    const moved = arrayMove(draft.products, oldIndex, newIndex).map((product, index) => ({ ...product, order: index + 1 }));
    onDraft({ ...draft, products: moved });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <div className="space-y-5">
        <section className="rounded-lg bg-white p-4 shadow-soft">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Товары</h2>
            <button type="button" onClick={addProduct} className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white">
              <Plus size={17} />
              Добавить
            </button>
          </div>
          <DndContext sensors={sensors} onDragEnd={onProductsDragEnd}>
            <SortableContext items={draft.products.map((product) => product.id)} strategy={verticalListSortingStrategy}>
              <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
                {draft.products.map((product) => (
                  <SortableRow key={product.id} id={product.id}>
                    <button
                      type="button"
                      onClick={() => onSelectProduct(product.id)}
                      className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-left ${selectedProduct?.id === product.id ? "bg-brand-50 text-brand-900" : "hover:bg-[#f7f8f3]"}`}
                    >
                      <div className="truncate font-bold">№ {product.sku || "—"} · {product.title || "Новый товар"}</div>
                      <div className="truncate text-xs text-[#42644d]">{draft.categories.find((category) => category.id === product.sectionId)?.title}</div>
                    </button>
                    <button type="button" onClick={() => deleteProduct(product.id)} className="rounded-full p-2 text-red-700 hover:bg-red-50" aria-label="Удалить товар">
                      <Trash2 size={17} />
                    </button>
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>

        <DirectoryPanel draft={draft} onDraft={onDraft} />
        <GitHubPanel github={github} onGithub={onGithub} onSaveGitHub={onSaveGitHub} />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1fr_380px]">
        {selectedProduct ? (
          <ProductForm product={selectedProduct} draft={draft} onProduct={updateProduct} issues={issues.filter((issue) => issue.productId === selectedProduct.id)} />
        ) : (
          <div className="rounded-lg bg-white p-6 shadow-soft">Добавьте товар, чтобы открыть форму.</div>
        )}
        <section className="rounded-lg bg-white p-4 shadow-soft">
          <h2 className="mb-4 text-xl font-bold">Предпросмотр</h2>
          {selectedProduct ? <ProductCard product={selectedProduct} catalog={draft} compact /> : null}
        </section>
      </div>
    </div>
  );
}

function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="flex items-center gap-2 rounded-lg border border-brand-100 bg-white p-1">
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
    <section className="rounded-lg bg-white p-5 shadow-soft">
      <h2 className="text-xl font-bold">Карточка товара</h2>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Field label="Раздел *" error={issueText.get("sectionId")}>
          <select value={product.sectionId} onChange={(event) => set("sectionId", event.target.value)} className="input">
            {draft.categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}
          </select>
        </Field>
        <Field label="Номер позиции *" error={issueText.get("sku")}>
          <input value={product.sku} onChange={(event) => set("sku", event.target.value)} className="input" />
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
        <Field label="Вид нанесения">
          <input value={product.printType ?? ""} onChange={(event) => set("printType", event.target.value)} className="input" />
        </Field>
        <Field label="Объём">
          <input value={product.volume ?? ""} onChange={(event) => set("volume", event.target.value)} className="input" />
        </Field>
        <CheckboxGroup title="Корпоративные цвета" values={draft.corporateColors} selected={product.corporateColorIds ?? []} onSelected={(ids) => set("corporateColorIds", ids)} />
        <CheckboxGroup title="Размер одежды" values={draft.clothingSizes} selected={product.clothingSizeIds ?? []} onSelected={(ids) => set("clothingSizeIds", ids)} />
        <CheckboxGroup title="Материалы" values={draft.materials} selected={product.materialIds ?? []} onSelected={(ids) => set("materialIds", ids)} />
      </div>
    </section>
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

function DirectoryPanel({ draft, onDraft }: { draft: CatalogData; onDraft: (draft: CatalogData) => void }) {
  const [kind, setKind] = useState<DirectoryKind>("categories");
  const sensors = useSensors(useSensor(PointerSensor));
  const labels: Record<DirectoryKind, string> = {
    categories: "Разделы",
    corporateColors: "Корпоративные цвета",
    clothingSizes: "Размеры одежды",
    materials: "Материалы",
    cardBackgroundColors: "Фоны карточек"
  };
  const items = draft[kind] as Array<Category | CorporateColor | ClothingSize | Material | CardBackgroundColor>;

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
    <section className="rounded-lg bg-white p-4 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Справочники</h2>
        <button type="button" onClick={addItem} className="rounded-full bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700">Добавить</button>
      </div>
      <select value={kind} onChange={(event) => setKind(event.target.value as DirectoryKind)} className="input mb-3">
        {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
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

function GitHubPanel({ github, onGithub, onSaveGitHub }: { github: GitHubConfig; onGithub: (config: GitHubConfig) => void; onSaveGitHub: () => void }) {
  return (
    <section className="rounded-lg bg-white p-4 shadow-soft">
      <h2 className="text-xl font-bold">GitHub storage</h2>
      <p className="mt-2 text-sm leading-6 text-[#42644d]">Token хранится только в localStorage браузера и нужен для коммитов JSON в репозиторий.</p>
      <div className="mt-4 grid gap-3">
        {(["owner", "repo", "branch", "token"] as Array<keyof GitHubConfig>).map((field) => (
          <input
            key={field}
            value={github[field]}
            type={field === "token" ? "password" : "text"}
            placeholder={field === "owner" ? "Владелец репозитория" : field === "repo" ? "Репозиторий" : field === "branch" ? "Ветка" : "GitHub token"}
            onChange={(event) => onGithub({ ...github, [field]: event.target.value })}
            className="input"
          />
        ))}
        <button type="button" onClick={onSaveGitHub} className="rounded-full bg-brand-700 px-4 py-3 font-bold text-white hover:bg-brand-900">
          Сохранить в GitHub
        </button>
      </div>
    </section>
  );
}

function AccessAdmin({ users, currentUser, onUsers }: { users: User[]; currentUser: User; onUsers: (users: User[]) => void }) {
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
    onUsers([...users, user]);
    setLogin("");
    setPassword("");
    setMessage("Сотрудник создан.");
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
