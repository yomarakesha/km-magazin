"""Seed a full, presentable demo: catalog + warehouse (suppliers, purchases,
cost prices, stock ledger) + staff accounts + promo + a spread of past orders
so every report and journal shows real data.

Idempotent — rebuilds the shop catalog (via seed_shop) and wipes/reinserts all
demo warehouse, order, promo and non-owner staff data. The root `admin` owner
(seeded from ADMIN_PASSWORD) is preserved.

Run from backend/:  python -m app.seed_demo
"""
from datetime import datetime, timedelta, timezone

from .db import SessionLocal, init_db
from .models import (
    AdminUser,
    Lead,
    Order,
    OrderItem,
    Product,
    PromoCode,
    PurchaseDoc,
    PurchaseItem,
    Sale,
    SaleItem,
    ShopService,
    StockMovement,
    Supplier,
)
from .security import hash_password
from .seed_shop import SETTINGS, seed_shop

NOW = datetime.now(timezone.utc)


def _days_ago(n: int) -> datetime:
    return NOW - timedelta(days=n)


# Staff accounts (owner `admin` already exists). Simple demo passwords.
STAFF = [
    ("sklad", "sklad12345", "warehouse"),
    ("operator", "operator12345", "sales"),
    ("kontent", "kontent12345", "content"),
]

SUPPLIERS = [
    ("Ак Ёл Импорт", "+993 12 345678", "основной поставщик ПК и комплектующих"),
    ("Мерв Электроникс", "+993 12 111222", "периферия, мониторы"),
    ("Ашгабат Техно", "+993 65 909090", "сетевое оборудование"),
]

# Service requests: (name, phone, message, service slug | None, status, days ago)
LEADS = [
    ("Мердан", "+993 65 111111", "Нужна игровая сборка до 15 000 TMT.", "pc-build", "new", 0),
    ("Офис «Ак Ýol»", "+993 12 334455", "Сеть на 12 рабочих мест и Wi‑Fi.", "net-setup", "read", 2),
    ("Айгуль", "+993 63 222333", "Ноутбук сильно греется.", "pc-maintenance", "done", 6),
    ("Склад «Берк»", "+993 12 998877", "Камеры по периметру, 8 штук.", "cam-install", "new", 1),
]

DELIVERY_FEE = SETTINGS["delivery_fee"]

# A product is left "под заказ" (untracked) when its index % 5 == 4.
UNTRACKED_EVERY = 5
DEFAULT_QTY = 12          # units received per product
COST_RATIO = 0.72         # purchase cost ≈ 72% of retail price
RU = "ru"


def _title(p: Product) -> str:
    return next((t.title for t in p.translations if t.lang == RU), None) or p.slug


def _title_service(s: ShopService) -> str:
    return next((t.title for t in s.translations if t.lang == RU), None) or s.slug


def _wipe_demo(db) -> None:
    """Clear everything this script owns; keep catalog (seed_shop rebuilds it)
    and the root owner account."""
    db.query(StockMovement).delete()
    db.query(SaleItem).delete()
    db.query(Sale).delete()
    db.query(OrderItem).delete()
    db.query(Order).delete()
    db.query(PurchaseItem).delete()
    db.query(PurchaseDoc).delete()
    db.query(Supplier).delete()
    db.query(PromoCode).delete()
    db.query(Lead).delete()
    db.query(AdminUser).filter(AdminUser.role != "owner").delete()
    db.commit()


def seed_demo() -> None:
    seed_shop()          # rebuild catalog, services, brands, settings
    init_db()            # ensure warehouse/user tables exist
    db = SessionLocal()
    try:
        _wipe_demo(db)

        # ---- staff ----
        for username, password, role in STAFF:
            db.add(AdminUser(username=username, password_hash=hash_password(password), role=role))

        # ---- suppliers ----
        suppliers = [Supplier(name=n, phone=ph, note=note) for n, ph, note in SUPPLIERS]
        db.add_all(suppliers)
        db.flush()

        # ---- decide tracked vs. under-order, set cost, reset counters ----
        products = db.query(Product).order_by(Product.id).all()
        stock: dict[int, int] = {}       # running counter per tracked product
        cost: dict[int, int] = {}
        tracked: list[Product] = []
        for i, p in enumerate(products):
            if i % UNTRACKED_EVERY == UNTRACKED_EVERY - 1:
                p.stock_qty = None       # под заказ
                continue
            p.stock_qty = 0              # will be filled by the purchase below
            p.cost_price = round(p.price * COST_RATIO)
            cost[p.id] = p.cost_price
            stock[p.id] = 0
            tracked.append(p)
        db.flush()

        # ---- purchase docs (приходные накладные) 20 days ago ----
        # split tracked products across the three suppliers, round-robin
        purchase_date = _days_ago(20)
        docs: list[PurchaseDoc] = []
        for idx, sup in enumerate(suppliers):
            items_for = [p for j, p in enumerate(tracked) if j % len(suppliers) == idx]
            if not items_for:
                continue
            doc = PurchaseDoc(
                supplier_id=sup.id, note=f"стартовая партия — {sup.name}",
                username="sklad", created_at=purchase_date, total_cost=0,
            )
            total = 0
            for p in items_for:
                unit = cost[p.id]
                doc.items.append(PurchaseItem(
                    product_id=p.id, title_snapshot=_title(p), qty=DEFAULT_QTY, unit_cost=unit,
                ))
                total += DEFAULT_QTY * unit
            doc.total_cost = total
            db.add(doc)
            docs.append(doc)
        db.flush()

        # receipt movements for each purchase line
        for doc in docs:
            for it in doc.items:
                stock[it.product_id] += it.qty
                db.add(StockMovement(
                    product_id=it.product_id, qty_delta=it.qty, stock_after=stock[it.product_id],
                    kind="receipt", note=f"накладная #{doc.id}", unit_cost=it.unit_cost,
                    supplier_id=doc.supplier_id, purchase_id=doc.id, username="sklad",
                    created_at=doc.created_at,
                ))
        # apply counters to products
        for p in tracked:
            p.stock_qty = stock[p.id]
        db.flush()

        # ---- promo ----
        promo = PromoCode(code="SALE10", kind="percent", value=10, min_total=0,
                          active=True, used_count=0, max_uses=None, created_at=_days_ago(18))
        db.add(promo)

        # ---- a spread of orders over the last two weeks ----
        services = db.query(ShopService).order_by(ShopService.id).all()
        svc_by = {s.id: s for s in services}
        # order recipe: (days_ago, [(product_index_in_tracked, qty)], service_id|None, promo?, status)
        recipes = [
            (14, [(0, 1)], None, False, "delivered"),
            (12, [(1, 1), (2, 1)], (services[0].id if services else None), False, "delivered"),
            (11, [(3, 2)], None, True, "delivered"),
            (9,  [(0, 1)], None, False, "delivered"),
            (8,  [(2, 1)], (services[0].id if services else None), False, "delivered"),
            (6,  [(1, 1)], None, True, "delivered"),
            (5,  [(4, 1), (0, 1)], None, False, "confirmed"),
            (3,  [(2, 2)], None, False, "confirmed"),
            (2,  [(3, 1)], (services[1].id if len(services) > 1 else None), False, "new"),
            (1,  [(0, 1)], None, True, "new"),
            (4,  [(1, 1)], None, False, "cancelled"),
        ]
        customers = [
            ("Мурад Аннаев", "+993 65 101010"), ("Джерен Керимова", "+993 65 202020"),
            ("Сердар Оразов", "+993 61 303030"), ("Айна Мамедова", "+993 62 404040"),
            ("Батыр Ходжаев", "+993 63 505050"),
        ]

        for k, (days, plines, service_id, use_promo, status) in enumerate(recipes):
            when = _days_ago(days)
            name, phone = customers[k % len(customers)]
            order = Order(
                customer_name=name, phone=phone, address="г. Ашгабат, ул. Демонстрационная, 1",
                payment_method="cash" if k % 2 else "terminal", comment="", status=status,
                payment_status="paid" if status == "delivered" else "unpaid",
                created_at=when, total=0,
            )
            total = 0
            move_rows: list[StockMovement] = []
            for ti, qty in plines:
                p = tracked[ti]
                order.items.append(OrderItem(
                    product_id=p.id, title_snapshot=_title(p), price_snapshot=p.price,
                    cost_snapshot=cost.get(p.id), qty=qty,
                ))
                total += p.price * qty
                # stock effect (skip net change for cancelled: sale then return)
                stock[p.id] -= qty
                move_rows.append(StockMovement(
                    product_id=p.id, qty_delta=-qty, stock_after=stock[p.id], kind="sale",
                    order_id=None, note="", username="", created_at=when,
                ))
                if status == "cancelled":
                    stock[p.id] += qty
                    move_rows.append(StockMovement(
                        product_id=p.id, qty_delta=qty, stock_after=stock[p.id], kind="return",
                        order_id=None, note="отмена заказа", username="operator",
                        created_at=when + timedelta(hours=2),
                    ))
            if service_id and service_id in svc_by:
                s = svc_by[service_id]
                order.items.append(OrderItem(
                    service_id=s.id, title_snapshot=_title_service(s),
                    price_snapshot=s.price, qty=1,
                ))
                total += s.price
            if use_promo:
                discount = round(total * 0.10)
                order.promo_code = promo.code
                order.discount = discount
                total -= discount
                promo.used_count += 1
            # same rule as checkout: delivery on top of the (discounted) goods
            order.delivery = DELIVERY_FEE
            order.total = total + DELIVERY_FEE
            db.add(order)
            db.flush()  # order.id
            for m in move_rows:
                m.order_id = order.id
                db.add(m)

        # ---- POS (касса): a few counter sales, one still a debt ----
        # (product_index_in_tracked, qty, sold_total_override|None, payment, days_ago, debtor)
        pos_recipes = [
            (0, 1, None, "cash", 7, None),                      # обычная продажа
            (2, 2, "disc", "terminal", 4, None),                # со скидкой 10%
            (1, 1, None, "debt", 2, ("Гурбан Атаев", "+993 64 707070")),
        ]
        pos_count = 0
        for ti, qty, kind_price, payment, days, debtor in pos_recipes:
            if ti >= len(tracked) or stock[tracked[ti].id] < qty:
                continue
            p = tracked[ti]
            when = _days_ago(days)
            subtotal = p.price * qty
            sold_total = round(subtotal * 0.9) if kind_price == "disc" else subtotal
            sale = Sale(
                seller="operator", subtotal=subtotal, sold_total=sold_total,
                discount=subtotal - sold_total, cost_total=cost[p.id] * qty,
                status="debt" if payment == "debt" else "paid", payment_method=payment,
                debtor_name=debtor[0] if debtor else None,
                debtor_phone=debtor[1] if debtor else None,
                created_at=when,
            )
            sale.items.append(SaleItem(
                product_id=p.id, title_snapshot=_title(p), price_snapshot=p.price,
                cost_snapshot=cost[p.id], qty=qty,
            ))
            db.add(sale)
            db.flush()
            stock[p.id] -= qty
            db.add(StockMovement(
                product_id=p.id, qty_delta=-qty, stock_after=stock[p.id], kind="sale",
                sale_id=sale.id, note=f"касса, чек #{sale.id}", username="operator",
                created_at=when,
            ))
            pos_count += 1

        # persist final counters (orders + POS consumed some stock)
        for p in tracked:
            p.stock_qty = stock[p.id]

        # ---- service requests (leads) from the service pages ----
        svc_by_slug = {s.slug: s for s in db.query(ShopService).all()}
        for name, phone, message, svc_slug, status, days in LEADS:
            svc = svc_by_slug.get(svc_slug) if svc_slug else None
            db.add(Lead(
                name=name, phone=phone, message=message, status=status,
                service_id=svc.id if svc else None, created_at=_days_ago(days),
            ))

        db.commit()

        # ---- report ----
        print("Demo seeded:")
        print(f"  staff:      admin (owner) + {', '.join(u for u, _, _ in STAFF)}")
        print(f"  suppliers:  {len(suppliers)}")
        print(f"  purchases:  {len(docs)} docs, {sum(len(d.items) for d in docs)} lines")
        print(f"  tracked:    {len(tracked)} products with stock+cost, "
              f"{len(products) - len(tracked)} 'под заказ'")
        print(f"  orders:     {len(recipes)} (delivered/confirmed/new/cancelled), promo SALE10")
        print(f"  pos sales:  {pos_count} (наличные/терминал/1 долг)")
        print(f"  movements:  {db.query(StockMovement).count()} ledger rows")
        print(f"  leads:      {len(LEADS)} service requests")
        print("\n  Staff logins (username / password):")
        for u, pw, role in STAFF:
            print(f"    {u:9} / {pw:16} [{role}]")
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo()
