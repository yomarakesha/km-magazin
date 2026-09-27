# Backend gaps

Storefront features that the API (`/api/shop/*`) doesn't fully support yet. The UI still shows everything; each item
below says what the storefront does in the meantime and what we'd need from the backend.

Checked against the backend at commit `abb8476` ("push delayda"), using the demo data from `seed_demo`.

## Status: all done on the backend

Every item below is implemented. The storefront needs these changes:

| # | What the API now gives | Storefront change |
|---|------------------------|-------------------|
| 1 | `warranty_months: int \| null` on `GET /products/{slug}`; editable on the admin product page | Show it in the "Гарантия" row; `null` stays "—" |
| 2 | `lat`, `lng` (numbers or `null`) in every `settings` object; editable on the admin "Контакты магазина" page | Read the map pin from `settings`; keep the hardcoded point only as a fallback for `null` |
| 3 | `category=cpu,gpu` (OR, each with its subcategories), paged on the server. An unknown slug → 404. Characteristic filters (`<key>=…`) apply only when exactly one category is given | Replace the per-category requests with one request |
| 4 | `q` is split into words; every word must match the title, short text (any language), brand name or SKU. Case-insensitive, `ё` = `е`. Same in `/search` | None |
| 5 | Facet options: `{ value, label: { ru, tk, en }, count }`. Product `attributes[]`: new `value_label: { ru, tk, en }` (`label` is still the characteristic's name). Missing translations fall back to Russian, then to `value`. `value` stays the filter key. Admins edit translations in the category → characteristic → "Значения и переводы" | Display `label[lang]` / `value_label[lang]` instead of `value` |
| 6 | `image` (path under `mediaBase`, or `null`) on `GET /pages/{slug}`; uploadable on the admin page editor | Use `image` for the "Наш магазин" photo; the bundled file can go |

Smaller notes:

- **Category facet order:** `facets.categories` now follows the admin tree (parents before children, siblings by `sort_order`), and each row carries `sort_order`. The client-side re-sort can go.
- **Category tree without products:** new `GET /api/shop/categories` → `{ mediaBase, categories }`, same rows as `catalog.categories` (now also with `sort_order`).
- **Rate limit on `/products`:** raised from 60 to 180 requests/min per IP. With item 3 the multi-category fan-out is gone too.

Content / seed data (`python -m app.seed_demo`; `backend/data/km.db` is already re-seeded):

- **Hero banner:** now `banners/hero-pc.png`, the 680×340 cut-out product picture with no text. On an existing DB the old `hero-computer-store.png` is swapped automatically on re-seed; otherwise replace it in the admin.
- **Descriptions and specs:** every product has `body` and `specs` in `ru`/`tk`/`en`.
- **SKU:** every product has one (`KM-CPU-003`…), so SKU search works.
- **Turkmen translations:** product `short` is translated to `tk`/`en`; service `body`/`feats` are filled in `tk`.
- **Warranty, map pin, about-page photo:** filled in by the seed (on an existing DB only where still empty).
- **Images:** still missing for most products, all categories and all services. They need real photos uploaded in the admin; the seed can't make them up.

## API changes

### 1. Product warranty term

- **Where:** product page → "Характеристики" table, the "Гарантия" row.
- **Now:** the API has no warranty field, so the row shows "—".
- **Need:** `warranty_months: int | null` on `GET /api/shop/products/{slug}`, editable in the admin. The storefront shows
  it as "36 месяцев" / "36 aý".

### 2. Store coordinates for the map

- **Where:** contacts page → map.
- **Now:** the coordinates are hardcoded in the storefront (`src/shared/config/store-location.ts`), so moving the store
  needs a frontend release.
- **Need:** `lat` and `lng` (numbers) in `Settings` (`GET /api/shop/settings` and the other responses that include
  `settings`), editable in the admin next to the address.

### 3. Filtering by several categories at once

- **Where:** "Скидки", "Новинки" and search results → the "Категория" filter, where several categories can be ticked.
- **Now:** `category` takes a single slug. With 2+ categories ticked, the storefront requests each category separately,
  pages through every result, then merges and sorts them on the client. That's N× the requests, with no server paging.
- **Need:** `category=cpu,gpu` (comma = OR, like `brand`), with facets computed the same way as today. The storefront
  switches to it with a one-line change.

### 4. Search matching

- **Where:** header search → `/search?q=`.
- **Now:** `q` must appear as one exact substring of the title/short/SKU:
  - `ryzen 7800` → 0 results, although "AMD Ryzen 7 7800X3D" exists
  - `AMD 7600` → 0 results ("AMD Ryzen 5 7600")
  - the brand name only matches when it's also in the title
  - `ё` and `е` are treated as different letters
- **Need:** split `q` into words and require **every** word to match the title, short, brand name or SKU (in any
  language), ignoring case and treating `ё` as `е`. The old storefront mock searched this way.

### 5. Translatable characteristic values

- **Where:** product page characteristics, and the "По характеристике" filter options.
- **Now:** attribute values are plain strings, so a Turkmen visitor sees Russian values such as "Нет" (the GPU model of
  CPUs without integrated graphics) or colour names. The old mock translated values like yes/no, colours, camera
  types and device types.
- **Need:** per-language labels for `select` options (for example `{ value: "no", label: { ru: "Нет", tk: "Ýok", en: "No" } }`
  in facets and in product `attributes`). Keep `value` as the filter key.

### 6. Image on info pages

- **Where:** "Наш магазин" (`about` page) → the wide store photo under the intro.
- **Now:** the photo is bundled with the storefront.
- **Need:** an optional `image` on pages (`GET /api/shop/pages/{slug}`), uploadable in the admin.

## Smaller API notes

- **Category facet order:** `facets.categories` in `/products` is sorted by slug. The storefront re-sorts it by the
  category tree, but admin order from the API (`sort_order`) would be simpler.
- **Category tree without products:** the storefront loads the tree from `GET /api/shop/catalog?limit=1` and throws
  away the product it returns. A lighter endpoint such as `GET /api/shop/categories`, or `limit=0`, would do.
- **Rate limit on `/products` (60/min per IP):**
  - every filter change on a listing is one request
  - "По характеристике" mode adds one per tick, for live counts
  - the multi-category workaround (item 3) adds one per category

  Heavy filter use, or several people behind one NAT, can hit 429. Consider a higher limit for this endpoint.

## Content / seed data

These need no code changes, only data in the admin or the seed:

- **Hero banner image:** `banners/hero-computer-store.png` already has the headline and the feature row drawn into the
  picture. The storefront renders the banner's `title` / `subtitle` and the feature row itself, so the text shows twice.
  Banners need a cut-out product picture (white or transparent background, about 680×340), like the mockup.
- **Product descriptions:** `body` is empty for most products, so the storefront falls back to `short`. `specs` is
  empty for every product, so only the filterable `attributes` show in the characteristics table.
- **SKU:** `null` for every product, so searching by SKU finds nothing.
- **Images:** most products, all categories and all services have no image, so placeholders show.
- **Turkmen translations:** service `body` and `feats` are empty in `tk`, and product `short` in `tk`/`en` holds the
  Russian text ("8 ядер, AM5…"). The storefront falls back to Russian when a translation is empty, but not when it
  holds the wrong language.
