# KM Magazin — Frontend API Guide

Storefront of **Kanagatly Mahabat** (computer hardware, security systems, network
equipment, services). This document describes everything the storefront frontend
needs from the backend. The admin panel (`admin/`, served at `/admin`) already
exists and uses the `/api/admin/*` endpoints listed at the end for reference.

- **Backend:** FastAPI + SQLite, `http://localhost:8000` in dev
- **Interactive docs (Swagger):** `http://localhost:8000/docs` — every endpoint, try-it-out
- **OpenAPI JSON:** `http://localhost:8000/openapi.json` (can be used to generate TS types)
- **Design:** Figma (storefront is built separately from this repo)

Start the backend: `bash scripts/start.sh` (seeds demo data on first run).

---

## 1. Conventions

### Base URL and CORS
All storefront endpoints live under `/api/shop/*`, plus `POST /api/leads`.
CORS allows exactly one origin: `FRONTEND_ORIGIN` from `backend/.env`
(default `http://localhost:3000`). Run the frontend dev server on port 3000,
or ask for the value to be changed.

### Authentication
The storefront is **fully public** — no login, no tokens, no customer accounts.
Orders are placed as a guest with name + phone. (Admin auth is cookie-based and
only relevant to the admin panel.)

### Languages
Three languages: `ru` (primary), `tk`, `en`. The API does **not** take a
language parameter. Every translatable text comes back as a map:

```json
"title": { "ru": "Процессоры", "tk": "Prosessorlar", "en": "Processors" }
```

Pick `field[lang]` on the client. A language may be an empty string or missing
when not translated yet — fall back to `ru`:

```ts
const t = (m: Record<string, string> | undefined, lang: Lang) => m?.[lang] || m?.ru || "";
```

Brand names, SKUs, attribute *values*, and contact phone/email are plain strings.

### Media (images)
Image fields are paths **relative to `mediaBase`**, e.g. `"products/seed-lancool.png"`.
Most responses include `mediaBase` (e.g. `"http://localhost:8000/media"`):

```ts
const src = img ? `${mediaBase}/${img}` : PLACEHOLDER;
```

Image fields can be `null` — always have a placeholder.
Folders: `products/`, `categories/`, `services/`, `banners/`.

### Money
All prices are **integers** in the currency given (`"TMT"` everywhere now).
No decimals, no cents. Display e.g. `6 990 TMT`.

### Pagination
List endpoints take `limit` (default **12**, max **48**) and `offset` (default 0),
and return `total`. Page count = `ceil(total / limit)`.

### Errors
| Status | Meaning | Body |
|--------|---------|------|
| 400 | Bad input the schema could not catch (e.g. unknown delivery zone) | `{"detail": "Delivery zone is unavailable"}` |
| 404 | Slug/id not found or disabled | `{"detail": "Product not found"}` |
| 409 | Conflict (cart item gone, out of stock, promo exhausted) | see *Orders* |
| 422 | Validation error (FastAPI/Pydantic) | `{"detail": [{"loc": ["body","phone"], "msg": "...", "type": "..."}]}` |
| 429 | Rate limited | `{"detail": "Too many requests, please slow down"}` |

`detail` is a string in most cases, an array for 422 validation, and an **object**
for the structured cases (`cart_invalid`, `below_min`) documented below.

### Rate limits (per client IP, 60-second window)
| Endpoint | Limit |
|----------|-------|
| `GET /api/shop/products` | 60 / min |
| `GET /api/shop/search` | 30 / min |
| `POST /api/shop/orders` | 5 / min |
| `POST /api/shop/promo/check` | 10 / min |
| `GET /api/shop/orders/{id}` | 10 / min |
| `POST /api/shop/products/{slug}/reviews` | 3 / min |
| `POST /api/leads` | 3 / min |

**SSR note:** if the frontend renders server-side, all SSR requests come from one
IP and would share one bucket. Send header `X-Internal-Key: <REVALIDATE_SECRET>`
on server-side fetches to bypass the limiter (secret shared via `.env`; never
expose it to the browser).

### Cache revalidation (optional, for Next.js / SSR)
After any successful admin write, the backend calls
`POST {FRONTEND_ORIGIN}/api/revalidate` with header
`X-Revalidate-Secret: <REVALIDATE_SECRET>` and body:

```json
{ "tags": ["shop"] }      // catalog, products, stock, orders, delivery changed
{ "tags": ["content"] }   // banners, pages, services, other content changed
```

Implement that route to invalidate tagged fetch caches. Disabled while
`REVALIDATE_SECRET` is empty; then just use a short revalidate window (~60 s).

---

## 2. Shared shapes (TypeScript)

```ts
type Lang = "ru" | "tk" | "en";
type I18n = Partial<Record<Lang, string>>;

interface BrandRef { slug: string; name: string }

/** Product card — used in every list (home rows, catalog, search, similar). */
interface ProductCard {
  id: number;
  slug: string;
  category_id: number;
  category: { slug: string; name: I18n };  // shown under the title in cart lines
  brand: BrandRef | null;
  is_new: boolean;            // "Новинка" badge
  is_build: boolean;          // ready-made PC ("Наша сборка")
  price: number;
  old_price: number | null;   // show strikethrough + discount % when > price
  currency: string;           // "TMT"
  in_stock: boolean;          // false → "Под заказ" / to order
  image: string | null;       // first image, relative to mediaBase
  title: I18n;
  short: I18n;                // one-line subtitle
  rating: number | null;      // average of approved reviews, 1 decimal
  rating_count: number;
}

interface CategoryView {
  id: number;
  parent_id: number | null;   // null = top-level section
  slug: string;
  name: I18n;
  image: string | null;
  product_count: number;      // products directly in this category
}

interface ServiceCard {
  id: number;
  slug: string;
  category_id: number | null; // section the service belongs to
  price: number;
  price_from: boolean;        // true → render "от 250 TMT"
  currency: string;
  icon: string;               // icon name: "wrench" | "settings" | "refresh" | "code" ...
  image: string | null;
  title: I18n;
  short: I18n;
}

interface Settings {           // shop contacts (header/footer/contacts block)
  phone: string;
  whatsapp: string;
  email: string;
  address: I18n;
  hours: I18n;
}

interface Banner {
  id: number;
  image: string | null;
  link: string;               // e.g. "/catalog/computers"
  title: I18n;
  subtitle: I18n;
}

interface DeliveryZone {
  id: number;
  name: I18n;                 // "По Ашхабаду", "По регионам", "Самовывоз"
  note: I18n;                 // "В день заявки или на следующий день"
  price: number;
  free_from: number | null;   // goods total from which delivery is free
  is_pickup: boolean;         // pickup → don't require an address
  is_default: boolean;        // preselect this one
}
```

---

## 3. Storefront endpoints

Screen map:

| Screen | Endpoint(s) |
|--------|-------------|
| Header / footer / contacts | `GET /api/shop/settings` (also in `/home`, `/catalog`, `/services`, `/pages/{slug}`), `/pages` for footer links |
| Home | `GET /api/shop/home` (+ `/products?build=1` for the builds row) |
| Catalog menu / all categories | `GET /api/shop/catalog` |
| Section page (tiles of subcategories) | `GET /api/shop/categories/{slug}` |
| Product listing, discounts, new, search, builds | `GET /api/shop/products` |
| Product page | `GET /api/shop/products/{slug}` + `/similar` |
| Brands page | `GET /api/shop/brands` |
| Services list / service page | `GET /api/shop/services`, `/services/{slug}`, `POST /api/leads` |
| Info pages (About, FAQ, Warranty, Delivery, Install) | `GET /api/shop/pages/{slug}` |
| Cart | `POST /api/shop/cart/validate`, `POST /api/shop/promo/check` |
| Checkout | `GET /api/shop/delivery-zones`, `POST /api/shop/orders` |
| Order status / re-order | `GET /api/shop/orders/{id}?phone=` |
| sitemap.xml | `GET /api/shop/sitemap` |

---

### 3.1 `GET /api/shop/home`
Everything the home page needs in one call. Rows are sorted by popularity, max 10 items.

```ts
{
  mediaBase: string;
  banners: Banner[];           // hero slider
  discount: ProductCard[];     // "Скидки" row (old_price > price)
  new: ProductCard[];          // "Новинки" row
  brands: { id: number; slug: string; name: string }[];
  settings: Settings;
}
```

Other home rows: builds → `GET /api/shop/products?build=1&sort=popular&limit=10`;
a category row → `GET /api/shop/products?category=<slug>&limit=10`.

---

### 3.2 `GET /api/shop/catalog`
Full category tree (flat list — build the tree from `parent_id`), brands,
services, contacts, plus a page of all products.

Query: `limit`, `offset` (for `products`).

```ts
{
  mediaBase: string;
  categories: CategoryView[];  // flat, ordered; parent_id === null → top-level section
  products: ProductCard[];     // all enabled products, admin order
  total: number;
  services: ServiceCard[];
  brands: { id: number; slug: string; name: string }[];
  settings: Settings;
}
```

Top-level sections in seed data: `computers`, `security`, `network`, `builds`.

```ts
const roots = categories.filter(c => c.parent_id === null);
const childrenOf = (id: number) => categories.filter(c => c.parent_id === id);
```

---

### 3.3 `GET /api/shop/categories/{slug}`
Section/category page. Returns subcategory tiles, filter definitions for this
category, the products **directly** in it, and related services.

Query: `price_min`, `price_max`, `in_stock=1`, `sort`, `limit`, `offset`,
plus attribute filters (same syntax as `/products`, see 3.4).

```ts
{
  mediaBase: string;
  slug: string;
  name: I18n;
  image: string | null;
  children: CategoryView[];    // tiles: Компьютеры → Процессоры, Материнская плата…
  facets: CategoryFacet[];
  products: ProductCard[];     // only products whose category is exactly this one
  total: number;
  services: ServiceCard[];     // services attached to this category
}

type CategoryFacet =
  | { key: string; label: I18n; type: "select"; unit: string;
      options: { value: string; count: number }[] }
  | { key: string; label: I18n; type: "number"; unit: string;
      min: number | null; max: number | null };
```

> **Tip:** for a *parent* section (e.g. `computers`) `products` is empty, because
> products sit in subcategories. For product grids with filters, prefer
> `GET /api/shop/products?category=<slug>` — it includes all subcategories and
> returns richer facets. Use this endpoint for the section header and `children` tiles.

404 `{"detail":"Category not found"}` if the slug is unknown or disabled.

---

### 3.4 `GET /api/shop/products` — main listing
Powers catalog grids, "Скидки", "Новинки", search results, "Наши сборки" and brand pages.
Rate limit 60/min.

**Query parameters** (all optional, combinable):

| Param | Example | Effect |
|-------|---------|--------|
| `q` | `ryzen` | Text search in title/short (any language) and SKU, case-insensitive |
| `category` | `cpu` | Category slug; **includes all subcategories**. Unknown → 404 |
| `brand` | `amd,intel` | Brand slugs, comma-separated (OR) |
| `price_min`, `price_max` | `1000`, `5000` | Integer price bounds, inclusive |
| `in_stock` | `1` | Only available now |
| `discount` | `1` | Only with `old_price > price` |
| `new` | `1` | Only `is_new` |
| `build` | `1` | Only ready-made PCs |
| `<attr key>` | `socket=AM5,LGA1700` | Characteristic filter (only with `category`), comma = OR |
| `<attr key>_min`, `<attr key>_max` | `cores_min=8` | Range for numeric characteristics |
| `sort` | `popular` | `popular` (best-selling) · `price_asc` · `price_desc` · `new` · omitted = admin order |
| `limit`, `offset` | `12`, `24` | Paging (max limit 48) |

Malformed numbers are ignored (no error).

**Response:**

```ts
{
  mediaBase: string;
  query: string;               // echoed q
  products: ProductCard[];
  total: number;
  facets: {
    categories: { slug: string; parent_id: number | null; name: I18n; count: number }[];
    brands:     { slug: string; name: string; count: number }[];
    price:      { min: number | null; max: number | null };
    attributes: {                // only when ?category= is set
      key: string;               // query param name to send back
      label: I18n;
      type: "select" | "number";
      unit: string;              // e.g. "W", "GB"; may be ""
      options: { value: string; count: number }[];
    }[];
  };
}
```

**Facet behavior:** each facet is computed with every filter applied *except its own*.
So after ticking brand "AMD", the brand facet still lists Intel etc. with counts
(multi-select checkboxes work naturally), while the other facets narrow down.
Facet options with count 0 are not returned.

Example — processors, AM5 socket, sorted by price:

```
GET /api/shop/products?category=cpu&socket=AM5&sort=price_asc&limit=12
```

```json
{
  "facets": {
    "attributes": [
      { "key": "socket", "label": {"ru": "Сокет", "en": "Socket", "tk": "Soket"},
        "type": "select", "unit": "",
        "options": [{"value": "AM5", "count": 2}, {"value": "LGA1700", "count": 3}] },
      { "key": "tdp", "label": {"ru": "Тепловыделение (TDP)"}, "type": "number", "unit": "W",
        "options": [{"value": "65", "count": 1}, {"value": "120", "count": 1}] }
    ]
  }
}
```

Keep filter state in the URL query string — it maps 1:1 to this endpoint.

#### Dynamic filters ("По характеристике")

Filters differ per category (Процессоры: Поколение, Сокет, Кол-во ядер, TDP,
Модель GPU; Видеокарты: Чип, Видеопамять …). Nothing is hard-coded on the
frontend — the chips come from the API.

**Where they come from.** In the admin, each category has a list of
characteristics (Категории → category → «Характеристики для фильтров»): `key`, label in 3
languages, type `select` or `number`, unit, and a `filterable` flag. Each
product then gets a value per characteristic. New characteristic in admin →
new filter chip on the site, no frontend release.

**Flow on a category listing page:**

1. Request `GET /api/shop/products?category=<slug>` (add current filters from the URL).
2. Render filter chips:
   - «Бренд» from `facets.brands`
   - one chip per item of `facets.attributes`, label `label[lang]`, in the order returned
   - «Цена» from `facets.price.min` / `max`
3. Chip dropdown = checkbox list of `options` (`value` + `unit`, optionally `(count)`).
4. «Применить фильтр» → put the ticked values into the URL as `<key>=v1,v2`
   and refetch. «Отмена» → drop that key.
5. Brand checkboxes → `brand=slug1,slug2`. Price → `price_min` / `price_max`.

```ts
// URL: /catalog/cpu?socket=AM5&generation=Ryzen%207000&brand=amd&sort=price_asc
const qs = new URLSearchParams(location.search);
qs.set("category", "cpu");
const data = await fetch(`${API}/api/shop/products?${qs}`).then(r => r.json());

data.facets.attributes.forEach(f => {
  const selected = (qs.get(f.key) ?? "").split(",").filter(Boolean);
  renderChip({
    label: t(f.label, lang),
    options: f.options.map(o => ({
      value: o.value,
      text: f.unit ? `${o.value} ${f.unit}` : o.value,
      count: o.count,
      checked: selected.includes(o.value),
    })),
    onApply: (vals: string[]) => {
      vals.length ? qs.set(f.key, vals.join(",")) : qs.delete(f.key);
      qs.delete("offset");                   // back to page 1
      navigate(`?${qs}`);
    },
  });
});
```

Rules:
- Characteristic facets appear **only when `category` is set**, and only for that
  exact category's characteristics. Top-level sections (`computers`, `security`,
  `network`) have none — show just Бренд / Цена / В наличии there.
- Values of one key are OR (`socket=AM5,LGA1700`); different keys are AND.
- Each facet is counted ignoring its own selection, so the list does not shrink
  while the user ticks boxes in it. Options with 0 matches are not returned.
- `number` characteristics come back as a value list too (`cores`: 4, 6, 8…),
  sorted numerically — render as checkboxes like in Figma. A range slider is
  possible with `<key>_min` / `<key>_max`.
- The same query params work on `/api/shop/categories/{slug}`, but prefer
  `/products` (includes subcategories and brand/price facets).

---

### 3.5 `GET /api/shop/search`
Simpler search (no facets). Rate limit 30/min. Query: `q`, `sort`, `limit`, `offset`.

```ts
{ mediaBase: string; query: string; products: ProductCard[]; total: number }
```

Use for a header search dropdown / autocomplete (debounce ≥ 300 ms). For the full
search results page use `/products?q=` to get facets.

---

### 3.6 `GET /api/shop/products/{slug}` — product page

```ts
{
  mediaBase: string;
  id: number;
  slug: string;
  category: string;            // category slug (breadcrumbs, link back)
  category_id: number;
  brand: BrandRef | null;
  is_new: boolean;
  price: number;
  old_price: number | null;
  currency: string;
  in_stock: boolean;
  stock_qty: number | null;    // null = stock not tracked; number = units left
  sku: string | null;
  title: I18n;
  short: I18n;
  body: I18n;                  // description, plain text (may contain \n)
  specs: Record<Lang, { label: string; value: string }[]>;  // "Характеристики" table
  images: string[];            // gallery, ordered; may be []
  attributes: {                // filterable characteristics
    key: string; label: I18n; value: string; unit: string;
  }[];
  components: BuildComponent[];  // non-empty only for ready-made PCs
  services: ServiceCard[];       // services for this product's category (upsell)
  rating: number | null;
  rating_count: number;
  reviews: { name: string; rating: number; text: string; created_at: string }[];  // approved, newest first, max 30
}

interface BuildComponent {
  kind: "product" | "service";
  slug: string | null;         // null if the part product is disabled (don't link)
  qty: number;
  price: number;
  title: I18n;
  short: I18n;
  category: I18n | null;       // part category name ("Процессоры"); null for services
  in_stock: boolean;
}
```

Display characteristics: show `specs[lang]` (free-form table) and/or
`attributes` (`label[lang]: value + unit`). `specs` may be empty for tk/en — fall back to `ru`.

404 if unknown or disabled.

---

### 3.7 `GET /api/shop/products/{slug}/similar`
"Похожие товары": same category first, then the rest of the parent section, most popular first.

Query: `limit` (default 8, max 24).

```ts
{ mediaBase: string; products: ProductCard[] }
```

---

### 3.8 `POST /api/shop/products/{slug}/reviews`
Submit a review. It is **hidden until an admin approves it** — show a
"Thanks, your review will appear after moderation" message. Rate limit 3/min.

```json
{ "name": "Aman", "rating": 5, "text": "Отличный процессор" }
```

| Field | Rules |
|-------|-------|
| `name` | required, 1–128 chars |
| `rating` | integer 1–5, default 5 |
| `text` | optional, ≤ 2000 chars |

Response `201 {"ok": true}`.

---

### 3.9 `GET /api/shop/brands`

```ts
{ brands: { id: number; slug: string; name: string; product_count: number }[] }
```

Brand page → `GET /api/shop/products?brand=<slug>`. Brands have no logo image field.

---

### 3.10 Services

**`GET /api/shop/services`**

```ts
{ mediaBase: string; services: ServiceCard[]; settings: Settings }
```

**`GET /api/shop/services/{slug}`** — service page

```ts
ServiceCard & {
  mediaBase: string;
  body: I18n;                        // description
  feats: Record<Lang, string[]>;     // "Что входит" bullet list
  others: ServiceCard[];             // "Другие услуги"
  settings: Settings;
}
```

Services can also be **added to the cart** (`kind: "service"`), e.g. PC assembly
with a build. Request form on the service page → `POST /api/leads`.

---

### 3.11 `POST /api/leads` — service request form
Rate limit 3/min.

```json
{
  "name": "Aman",
  "phone": "+993 65 123456",
  "email": "",
  "message": "Нужно установить 4 камеры",
  "service": "cam-install"
}
```

| Field | Rules |
|-------|-------|
| `name` | required, 1–128 |
| `phone` | ≤ 64 (not enforced as required — require it in the UI) |
| `email` | ≤ 128 |
| `message` | ≤ 4000 |
| `service` | slug of the service page it was sent from; `""` for a generic form. Unknown slug → 404 |

Response `201 {"ok": true, "id": 12}`.

---

### 3.12 Banners and info pages

**`GET /api/shop/banners`** → `{ mediaBase: string; banners: Banner[] }` (same as in `/home`).

**`GET /api/shop/pages`** — footer links:

```ts
{ pages: { slug: string; title: I18n }[] }
```

Seed slugs: `about`, `faq`, `guarantee`, `delivery`, `install`.

**`GET /api/shop/pages/{slug}`**

```ts
{
  slug: string;
  title: I18n;
  lead: I18n;                                   // intro paragraph
  blocks: Record<Lang, { title: string; body: string }[]>;  // sections / FAQ items
  settings: Settings;
}
```

Render `blocks[lang]` as sections; on `faq` render them as an accordion.
The delivery page should also show `GET /api/shop/delivery-zones`.

---

### 3.13 `GET /api/shop/delivery-zones`

```ts
{ zones: DeliveryZone[] }   // enabled zones, admin order
```

Seed data: Ashgabat 30 TMT (free from 5000), Regions 100 TMT, Pickup 0 TMT.
If the list is empty, delivery is free and the checkout should hide the choice.

---

## 4. Cart and checkout

The cart lives **only on the client** (e.g. `localStorage`). There is no
server-side cart. Store lines as:

```ts
interface CartLine { kind: "product" | "service"; id: number; qty: number }  // qty 1–999
```

Keep a snapshot of title/image/price for display, but always re-check with
`/cart/validate` before showing totals.

### 4.1 `POST /api/shop/cart/validate`
Call on cart page load, on qty change, and when the delivery zone changes.

Request:

```json
{
  "items": [
    { "kind": "product", "id": 1, "qty": 1 },
    { "kind": "service", "id": 1, "qty": 1 }
  ],
  "delivery_zone_id": 1
}
```

`items`: 1–100 lines. `delivery_zone_id` optional (omitted → default zone).

Response:

```ts
{
  items: {
    kind: "product" | "service";
    id: number;
    ok: boolean;               // false → item deleted/disabled: show "unavailable", exclude
    price: number | null;      // current price (may differ from what the cart stored)
    in_stock: boolean | null;
  }[];                         // same order as the request
  subtotal: number;            // sum of ok lines, BEFORE promo
  delivery: {
    zone_id: number | null;
    fee: number;               // delivery price for this subtotal
    free_from: number | null;
    to_free: number | null;    // "Добавьте ещё X TMT для бесплатной доставки"; null if n/a
  };
  delivery_fee: number;        // = delivery.fee
  zones: DeliveryZone[];       // for the zone selector
}
```

Unknown `delivery_zone_id` → 400 `{"detail": "Delivery zone is unavailable"}`.

> Note: `delivery.fee` here is computed on the subtotal **before** promo; the
> order endpoint computes it on the total **after** promo. They can differ when a
> promo drops the total below `free_from`. The order response is authoritative.

### 4.2 `POST /api/shop/promo/check`
Rate limit 10/min.

```json
{ "code": "SALE10", "subtotal": 7240 }
```

`200`:

```ts
{ code: string; kind: "percent" | "fixed"; value: number; min_total: number; discount: number }
```

Errors:
- `404 {"detail": "Promo code is not valid"}` — unknown, inactive, expired or used up.
- `422 {"detail": {"code": "below_min", "min_total": 3000}}` — valid code, but cart
  too small: show "Add N TMT more to use this code" (`min_total - subtotal`).

Discount: `percent` → `floor(subtotal * value / 100)`; `fixed` → `value`. Never more than subtotal.

### 4.3 `POST /api/shop/orders` — place order
Rate limit 5/min. Server recomputes everything from DB prices; the client never sends prices.

```json
{
  "customer_name": "Aman Amanov",
  "phone": "+993 65 123456",
  "address": "Ашхабад, ул. ...",
  "payment_method": "cash",
  "comment": "Позвоните перед доставкой",
  "promo_code": "SALE10",
  "delivery_zone_id": 1,
  "items": [
    { "kind": "product", "id": 1, "qty": 1 },
    { "kind": "service", "id": 1, "qty": 1 }
  ]
}
```

| Field | Rules |
|-------|-------|
| `customer_name` | required, 1–128 |
| `phone` | required, 1–64. **Save it on the client** — needed for order lookup |
| `address` | ≤ 512; optional in the API (make it required in the UI unless zone `is_pickup`) |
| `payment_method` | `"cash"` (default) or `"terminal"` (card on delivery). No online payment yet |
| `comment` | ≤ 2000 |
| `promo_code` | ≤ 32; invalid/below-min codes are **silently ignored** (check first with 4.2) |
| `delivery_zone_id` | optional, omitted → default zone |
| `items` | ≥ 1 line; `qty` 1–999 |

Total formula: `goods − promo discount + delivery(zone, goods after discount)`.

`201`:

```ts
{ ok: true; id: number; total: number; discount: number; delivery: number }
```

Show a "Thank you, order #<id>, manager will call you" screen, clear the cart,
and store `{id, phone}` for the order status page.

Errors:
- `409 {"detail": {"code": "cart_invalid", "problems": [{"kind": "product", "id": 7, "reason": "unavailable"}]}}`
  → highlight those lines, ask to remove them.
- `409 {"detail": "Product 7 is out of stock"}` → tracked stock is below qty.
- `409 {"detail": "Promo code is no longer valid"}` → promo ran out during checkout; retry without it.
- `400 {"detail": "Delivery zone is unavailable"}`.
- `422` validation (empty name/phone, empty items).
- `429` rate limit — disable the submit button while the request is in flight.

### 4.4 `GET /api/shop/orders/{id}?phone=...` — order status
Customer-facing lookup. The phone must match the order (only digits are
compared, so `+993 65-12-34-56` == `99365123456`). Any mismatch → 404.
Rate limit 10/min.

```ts
{
  id: number;
  status: "new" | "confirmed" | "delivered" | "cancelled";
  payment_method: "cash" | "terminal";
  payment_status: "unpaid" | "pending" | "paid" | "refunded";
  delivery: number;            // delivery fee charged
  delivery_zone: string;       // zone name (ru) at order time, may be ""
  total: number;
  created_at: string;          // ISO datetime
  items: {
    title: string;             // ru title snapshot at order time
    price: number;             // price snapshot
    qty: number;
    kind: "product" | "service";
    slug: string | null;       // for "Repeat order"; null if item deleted since
  }[];
}
```

Status labels (ru): new — «Новый», confirmed — «Подтверждён», delivered — «Доставлен», cancelled — «Отменён».

---

## 5. Misc

### `GET /api/shop/sitemap`

```ts
{ categories: string[]; products: { slug: string; lastmod: string | null }[] }
```

Build `sitemap.xml` from this. Suggested routes: `/catalog/<category slug>`,
`/product/<slug>`, `/services/<slug>`, `/pages/<slug>` — URL structure is the
frontend's choice (banner `link` values in seed use `/catalog/<slug>`).

### `GET /health`
`{"ok": true}` — liveness check.

### `GET /api/content`
Legacy landing-page content (old single-page site). **Not needed** for the shop.

### `POST /api/shop/payments/webhook`
Payment gateway callback slot — not called by the frontend. Returns 501 until an
online payment provider is configured.

---

## 6. Suggested frontend `.env`

```
NEXT_PUBLIC_API_URL=http://localhost:8000     # browser calls
API_URL=http://localhost:8000                 # server-side calls
INTERNAL_KEY=<same as backend REVALIDATE_SECRET>   # server only: X-Internal-Key header
REVALIDATE_SECRET=<same as backend REVALIDATE_SECRET>  # verifies /api/revalidate calls
```

Backend side (`backend/.env`): `FRONTEND_ORIGIN` = frontend URL (CORS + revalidate target),
`PUBLIC_URL` = public backend URL (used to build `mediaBase`).

---

## 7. Admin API (reference only)

Used by the existing admin panel. Auth: `POST /api/auth/login`
`{"username","password"}` sets an httpOnly cookie `km_admin` (JWT, 7 days,
SameSite=Lax); send requests with `credentials: "include"`.
`GET /api/auth/me` → `{authenticated, username, role}`; `POST /api/auth/logout`.
401 = not logged in, 403 = role not allowed. Roles: `owner` (everything),
`warehouse`, `sales`, `content`. Full request/response schemas: `/docs`.

| Area | Endpoints | Roles |
|------|-----------|-------|
| Categories | `GET/POST /api/admin/shop/categories`, `GET/PUT/DELETE .../categories/{id}`, `POST/DELETE .../categories/{id}/image`, `POST .../categories/reorder` | content (read: any) |
| Attributes (filters) | `GET/POST .../categories/{id}/attributes`, `PUT/DELETE /api/admin/shop/attributes/{id}`, `POST .../categories/{id}/attributes/reorder` | content (read: any) |
| Category services | `GET/POST .../categories/{id}/services`, `GET /api/admin/shop/services`, `PUT/DELETE .../services/{id}`, `POST/DELETE .../services/{id}/image`, `POST .../categories/{id}/services/reorder` | content |
| Brands | `GET/POST /api/admin/shop/brands`, `PUT/DELETE .../brands/{id}`, `POST .../brands/reorder` | content |
| Products | `GET/POST /api/admin/shop/products`, `GET/PUT .../products/{id}` (read: any; create/update: content, warehouse), `DELETE .../products/{id}`, `POST .../products/reorder` (content) | content, warehouse |
| Product images | `GET/POST .../products/{id}/images`, `DELETE /api/admin/shop/images/{id}`, `POST .../products/{id}/images/reorder` | content (read: any) |
| Reviews | `GET /api/admin/shop/reviews`, `PATCH/DELETE .../reviews/{id}` (status `pending`/`approved`/`rejected`) | content |
| Delivery zones | `GET/POST /api/admin/shop/delivery-zones`, `PUT/DELETE .../{id}`, `POST .../reorder` | owner (read: any) |
| Shop settings (contacts) | `GET/PUT /api/admin/shop/settings` | content (read: any) |
| Promo codes | `GET/POST /api/admin/shop/promos`, `PUT/DELETE .../promos/{id}` | sales |
| Orders | `GET /api/admin/shop/orders`, `PATCH .../orders/{id}` (status; only moves listed in the order's `next_statuses`, else 409; `delivered` also marks an unpaid order paid), `POST .../orders/{id}/take` (new → confirmed, records `taken_by`/`taken_at`), `PATCH .../orders/{id}/payment`, `DELETE .../orders/{id}` (owner), `GET /api/admin/shop/stats` (incl. `leads_new`) | sales (view: + warehouse) |
| Banners | `GET/POST /api/admin/site/banners`, `PUT/DELETE .../banners/{id}`, `POST .../banners/{id}/image`, `POST .../banners/reorder` | content |
| Info pages | `GET/POST /api/admin/site/pages`, `GET/PUT/DELETE .../pages/{id}` | content |
| Leads | `GET /api/admin/leads`, `PATCH/DELETE /api/admin/leads/{id}` (status `new`/`read`/`done`), `POST /api/admin/leads/{id}/take` (new → read, records `taken_by`/`taken_at`) | sales |
| Warehouse | `GET /api/admin/warehouse/stock`, `GET/POST .../movements`, `GET/POST .../suppliers`, `PATCH/DELETE .../suppliers/{id}`, `GET/POST .../purchases`, `GET .../purchases/{id}` | warehouse (read: + sales) |
| POS (cash register) | `GET /api/admin/pos/lookup`, `GET/POST /api/admin/pos/sales`, `GET .../sales/{id}`, `POST .../sales/{id}/settle`, `POST .../sales/{id}/void` (owner) | sales |
| Reports | `GET /api/admin/reports/sales`, `/services` (sales), `/stock` (warehouse) | as noted |
| Users | `GET/POST /api/admin/users`, `PATCH/DELETE /api/admin/users/{id}` | owner |
| Legacy landing | `/api/admin/content`, `/api/admin/services`, `/api/admin/media/*` | content |

Demo accounts after seed: `admin` (password from `backend/.env`), `sklad` / `sklad12345`,
`operator` / `operator12345`, `kontent` / `kontent12345`.
