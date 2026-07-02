# KM Marketplace — redesign + category-attached services

Date: 2026-07-01

## Goal
Two things:
1. **Visual** — the catalog feels too dark up top, the header hides on scroll (unwanted),
   and the category rail floats in the centered container's margin. Polish it into a
   top-marketplace-grade storefront, add promo/brand blocks.
2. **Feature** — sell/attach **services to shop categories** (network→setup, PC→repair &
   OS reinstall, cameras→installation). Customer can add a category's service to the cart
   and order it alongside products. Admin can CRUD services per category.

## Non-goals
- No change to the marketing landing `Service` model (CCTV/VMS directions) — that stays.
- No payment gateway (payment stays cash/terminal on delivery).

---

## A. Visual polish

### A1. Sticky nav (always visible)
`ShopChrome.Header` currently hides on scroll-down (`hidden` state, `.shop-head.hide`).
Remove the hide logic entirely; keep the `scrolled` shadow. Header stays pinned; search
stays in it. Mobile collapse rules (`@media 720px` hides `.shop-cats`) unchanged.

### A2. Hero — remove the black slab
`.shop-hero` is a tall dark gradient band holding only tag+title+subtitle → large empty
black area. Rework:
- Cut vertical padding ~40%.
- Two-column: text + CTAs (Каталог, WhatsApp) on the left; a branded visual with stat
  chips (гарантия · доставка · оплата при получении) on the right.
- Softer dark→canvas gradient bridge so it melts into the light page.

### A3. Sidebar left-align
Catalog list layout gets a wider container (`min(100% - 48px, 1440px)`) so the category
rail hugs the left gutter instead of sitting in the centered 1240px margin. Grid gains
room. Sticky offset unchanged. Scope the wider width to the catalog list page only.

### A4. New blocks
- Promo/trust banner (bright green cards) at the hero→canvas seam.
- Category tiles browse strip.
- Brands/partners marquee strip.
- "Услуги" teaser (feeds from B).

---

## B. Category-attached services

### B1. Data model (backend/app/models.py)
```
ShopService
  id, category_id FK(shop_categories, CASCADE), slug (unique), price int,
  currency "TMT", icon str, enabled bool, sort_order int
ShopServiceTranslation
  id, service_id FK(CASCADE), lang, title, short   (unique service_id+lang)
OrderItem  += service_id: int|None FK(shop_services, SET NULL)   # product_id already nullable
```
Migration: `create_all` makes the new tables. `db._migrate()` gets an idempotent
`ALTER TABLE shop_order_items ADD COLUMN service_id INTEGER REFERENCES shop_services(id)`.

### B2. Public API (shop_public.py)
- `/catalog` and `/categories/{slug}` responses include `services`: list of
  `{id, slug, title, short, price, currency, icon}` for enabled services of that category.
- `/products/{slug}` includes `services` of the product's category (add-ons).
- `/orders` accepts mixed items `{kind: "product"|"service", id, qty}`. Server validates
  each against the right table, snapshots title/price, recomputes total. Back-compat: an
  item without `kind` is treated as a product.

### B3. Frontend
- `shop-types.ts`: add `ShopService` type; extend `Catalog`/`CategoryView`/`ProductDetail`
  with `services`.
- `shop-context.tsx`: `CartItem` gains `kind: "product" | "service"`. Keys change from `id`
  to `${kind}:${id}` in add/setQty/remove/find to avoid product↔service id collision.
- Category page + PDP: "Услуги для категории" card block — title/short/price + "В корзину".
- Cart drawer / cart page / checkout: render both kinds; checkout posts `kind`+`id`+`qty`.

### B4. Admin
- Router: `/categories/{cat_id}/services` GET/POST, `/services/{id}` PUT/DELETE,
  `/categories/{cat_id}/services/reorder` — mirrors the attributes endpoints.
- Schemas: `ShopServiceIn/UpdateIn` + translation in.
- Page: `app/admin/shop/categories/[id]/services/page.tsx` mirroring the attributes page
  (CRUD, price, per-lang title/short, enable, reorder). Link from the category edit page.
- `lib/admin-api.ts`: add the service methods + types.
- Orders admin renders service line items automatically via existing snapshot fields.

### B5. Seed
`seed_shop.py`: add a couple of sample services per category so the UI has content.

---

## C. Admin flow (audit result)
Existing flow holds: categories → attributes / **services** / products → images → orders.
Services attach under a category as a sibling of attributes. Order detail already shows
line items via `title_snapshot`/`price_snapshot`, so service orders surface with no order-
view changes. Leads flow untouched.

## Phasing
1. Visual polish (frontend/CSS only) — ship + verify.
2. Services backend + cart wiring.
3. Admin services CRUD + seed + end-to-end verify.
