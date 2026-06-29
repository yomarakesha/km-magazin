"""Seed the database from seed_data.json and copy existing media files.

Run from the project root:  python -m backend.app.seed
Regenerate seed_data.json first with:  npm run dump:seed
"""
import json
import shutil
from pathlib import Path

from .config import BASE_DIR, MEDIA_DIR
from .db import SessionLocal, init_db
from .models import ContentBlock, Media, Service, ServiceTranslation

SEED_FILE = BASE_DIR / "app" / "seed_data.json"
FRONTEND_ASSETS = BASE_DIR.parent / "public" / "assets"  # km-site/public/assets


def _copy_media_file(subdir: str, name: str | None) -> None:
    if not name:
        return
    src = FRONTEND_ASSETS / subdir / name
    dst = MEDIA_DIR / subdir / name
    if src.exists():
        shutil.copy2(src, dst)
    else:
        print(f"  ! missing source media: {src}")


def seed() -> None:
    if not SEED_FILE.exists():
        raise SystemExit(f"{SEED_FILE} not found. Run `npm run dump:seed` first.")

    data = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    init_db()
    db = SessionLocal()
    try:
        # Wipe existing content (idempotent re-seed)
        db.query(Media).delete()
        db.query(ServiceTranslation).delete()
        db.query(Service).delete()
        db.query(ContentBlock).delete()
        db.commit()

        # Content blocks
        for lang, blocks in data["blocks"].items():
            for key, block in blocks.items():
                db.add(ContentBlock(key=key, lang=lang, data=block))

        # Services + translations + media
        for s in data["services"]:
            svc = Service(
                slug=s["slug"], icon=s["icon"], sort_order=s["sort_order"], enabled=s["enabled"]
            )
            for lang, tr in s["translations"].items():
                svc.translations.append(
                    ServiceTranslation(
                        lang=lang,
                        code=tr["code"],
                        short=tr["short"],
                        title=tr["title"],
                        body=tr["body"],
                        feats=tr["feats"],
                    )
                )
            for order, m in enumerate(s["media"]):
                subdir = "video" if m["kind"] == "video" else "img"
                _copy_media_file(subdir, m["filename"])
                _copy_media_file("img", m.get("poster"))
                svc.media.append(
                    Media(
                        kind=m["kind"],
                        filename=m["filename"],
                        poster=m.get("poster"),
                        still=m["still"],
                        caption_kind=m["caption_kind"],
                        sort_order=order,
                    )
                )
            db.add(svc)

        db.commit()
        print(
            f"Seeded {len(data['services'])} services, "
            f"{len(data['blocks'])} languages of blocks."
        )
    finally:
        db.close()


if __name__ == "__main__":
    seed()
