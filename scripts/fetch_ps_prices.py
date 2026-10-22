#!/usr/bin/env python3
"""PlayStation Store TR ürün sayfalarından fiyat okur -> data/ps-prices.json"""
import json, re, sys, time, urllib.request, urllib.error
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LINKS = ROOT / "ps-links.json"
OUT = ROOT / "data" / "ps-prices.json"
PREFIX = "https://store.playstation.com/tr-tr/"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")


def fetch(url, tries=3):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": UA, "Accept-Language": "tr-TR,tr;q=0.9"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except (urllib.error.URLError, TimeoutError) as e:
            last = e
            time.sleep(2 * (i + 1))
    raise RuntimeError(f"istek başarısız: {last}")


def walk(o):
    if isinstance(o, dict):
        yield o
        for v in o.values():
            yield from walk(v)
    elif isinstance(o, list):
        for v in o:
            yield from walk(v)


def parse(html, url):
    name = price = None
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if m:
        data = json.loads(m.group(1))
        for d in walk(data):
            if not name and d.get("__typename") == "Product" and d.get("name"):
                name = d["name"]
            if price is None and "basePrice" in d and "discountedPrice" in d:
                price = {
                    "base": d.get("basePrice"),
                    "discounted": d.get("discountedPrice"),
                    "discountText": d.get("discountText"),
                    "currency": d.get("currencyCode") or "TRY",
                    "free": bool(d.get("isFree")),
                }
    if price is None:  # yedek: JSON-LD
        for blk in re.findall(
                r'<script type="application/ld\+json"[^>]*>(.*?)</script>', html, re.S):
            try:
                j = json.loads(blk)
            except ValueError:
                continue
            for d in walk(j):
                if "offers" in d and not price:
                    off = d["offers"]
                    off = off[0] if isinstance(off, list) and off else off
                    if isinstance(off, dict) and "price" in off:
                        name = name or d.get("name")
                        price = {"base": None, "discounted": f'{off["price"]}',
                                 "discountText": None,
                                 "currency": off.get("priceCurrency", "TRY"),
                                 "free": float(off["price"]) == 0}
    if not price:
        raise ValueError("fiyat bulunamadı (sayfa yapısı değişmiş olabilir)")
    return {"url": url, "name": name or url, **price}


def main():
    links = json.loads(LINKS.read_text(encoding="utf-8"))
    old = {}
    if OUT.exists():
        old = {i["url"]: i for i in json.loads(OUT.read_text(encoding="utf-8")).get("items", [])}
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    items, errors = [], 0
    for url in links:
        if not url.startswith(PREFIX):
            print("atlandı (tr-tr değil):", url); continue
        try:
            it = parse(fetch(url), url)
            it.update(checkedAt=now, stale=False)
            print("OK  ", it["name"], it["discounted"])
        except Exception as e:
            errors += 1
            it = {**old.get(url, {"url": url, "name": url}), "stale": True,
                  "error": str(e), "checkedAt": now}
            print("HATA", url, e)
        items.append(it)
        time.sleep(1.5)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps({"updatedAt": now, "items": items},
                              ensure_ascii=False, indent=2), encoding="utf-8")
    sys.exit(1 if items and errors == len(items) else 0)


if __name__ == "__main__":
    main()
