#!/usr/bin/env python3
"""Classify house listings with DeepSeek Flash vision. Many parallel workers."""
from __future__ import annotations

import base64
import json
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOUSES = ROOT / "src/data/houses.json"
PHOTOS = ROOT / "public/photos"
OUT = ROOT / "scripts/look-results.jsonl"
SUMMARY = ROOT / "scripts/look-summary.json"

API = "https://api.deepseek.com/chat/completions"
MODEL = "deepseek-flash"
WORKERS = int(os.environ.get("DS_WORKERS", "72"))
MAX_RETRIES = 5

PROMPT = """Ты классифицируешь объявление о продаже дома в Подмосковье СТРОГО по фото.

Категории look:
- nice: реальные (не 3D) фото нового или свежеотремонтированного дома, который выглядит аккуратно, современно, хочется смотреть. Чистый фасад, нормальная архитектура, «пиздатый» новый дом.
- ok: реальные фото обычного жилого дома — не развалюха, но и не вау. Типичная коробка/коттедж без вау.
- junk: говно — старый, облезлый, убитый, дача 80-х, кривой недострой-развалюха, мусор, бабушкин дом.
- render: 3D-визуализация, CGI, архитектурный рендер, ненастоящие фото.

Правила:
- Если фасад/экстерьер — явный 3D-рендер и нет убедительных живых фото готового дома → render.
- Если есть и рендер, и живые фото реального дома — look по живым фото, media=mixed.
- Интерьеры без экстерьера: суди по качеству отделки.
- Зерно, провода, машины, грязь, люди, кривые ракурсы = живое фото, не рендер.
- Не путай аккуратную реальную съёмку с рендером.

Верни ТОЛЬКО JSON:
{"look":"nice|ok|junk|render","media":"photo|render|mixed","confidence":0.0-1.0,"why":"коротко по-русски"}
"""

LOOKS = {"nice", "ok", "junk", "render"}
MEDIA = {"photo", "render", "mixed"}
write_lock = threading.Lock()


def load_key() -> str:
    env = os.environ.get("DEEPSEEK_API_KEY")
    if env:
        return env.strip()
    p = Path.home() / ".config/deepseek.env"
    for line in p.read_text().splitlines():
        if line.startswith("export DEEPSEEK_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("no DEEPSEEK_API_KEY")


def photo_paths(hid: str) -> list[Path]:
    d = PHOTOS / str(hid)
    out = []
    for i in range(4):
        f = d / f"{i}.jpg"
        if f.exists() and f.stat().st_size > 2000:
            out.append(f)
    return out


def already_done() -> set[str]:
    done = set()
    if not OUT.exists():
        return done
    for line in OUT.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            continue
        if rec.get("ok") and rec.get("id") and rec.get("look") in LOOKS:
            done.add(str(rec["id"]))
    return done


def parse_json(text: str) -> dict:
    if not text:
        raise ValueError("empty content")
    text = text.strip()
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.S)
    if m:
        text = m.group(1)
    else:
        a, b = text.find("{"), text.rfind("}")
        if a >= 0 and b > a:
            text = text[a : b + 1]
    data = json.loads(text)
    look = str(data.get("look", "")).lower().strip()
    media = str(data.get("media", "")).lower().strip()
    if look not in LOOKS:
        raise ValueError(f"bad look {look!r}")
    if media not in MEDIA:
        media = "render" if look == "render" else "photo"
    conf = data.get("confidence", 0.5)
    try:
        conf = float(conf)
    except (TypeError, ValueError):
        conf = 0.5
    conf = max(0.0, min(1.0, conf))
    why = str(data.get("why") or "").strip()[:240]
    return {"look": look, "media": media, "confidence": round(conf, 3), "why": why}


def post(key: str, body: dict) -> dict:
    req = urllib.request.Request(
        API,
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", "replace")[:800]
        raise RuntimeError(f"HTTP {e.code}: {err}") from e


def classify_one(key: str, hid: str, paths: list[Path]) -> dict:
    content = [{"type": "text", "text": PROMPT}]
    for p in paths:
        b64 = base64.b64encode(p.read_bytes()).decode()
        content.append(
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "high"},
            }
        )
    body = {
        "model": MODEL,
        "messages": [{"role": "user", "content": content}],
        "max_tokens": 220,
        "thinking": {"type": "disabled"},
        "response_format": {"type": "json_object"},
    }
    last = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            data = post(key, body)
            msg = data["choices"][0]["message"].get("content") or ""
            parsed = parse_json(msg)
            parsed.update(
                {
                    "id": hid,
                    "ok": True,
                    "n_photos": len(paths),
                    "usage": data.get("usage"),
                    "attempt": attempt,
                }
            )
            return parsed
        except Exception as e:
            last = e
            time.sleep(min(8, 0.4 * attempt * attempt))
    return {"id": hid, "ok": False, "n_photos": len(paths), "error": str(last)[:500]}


def append(rec: dict) -> None:
    line = json.dumps(rec, ensure_ascii=False)
    with write_lock:
        with OUT.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
            f.flush()


def main() -> int:
    key = load_key()
    houses = json.loads(HOUSES.read_text())
    done = already_done()
    jobs = []
    skipped_no_photo = 0
    for h in houses:
        hid = str(h["id"])
        paths = photo_paths(hid)
        if not paths:
            skipped_no_photo += 1
            continue
        if hid in done:
            continue
        jobs.append((hid, paths))

    print(
        f"houses={len(houses)} jobs={len(jobs)} already={len(done)} no_photo={skipped_no_photo} workers={WORKERS}",
        flush=True,
    )
    if not jobs:
        print("nothing to do", flush=True)
        return 0

    t0 = time.time()
    ok = fail = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futs = {ex.submit(classify_one, key, hid, paths): hid for hid, paths in jobs}
        n = len(futs)
        for i, fut in enumerate(as_completed(futs), 1):
            rec = fut.result()
            append(rec)
            if rec.get("ok"):
                ok += 1
                mark = rec["look"]
            else:
                fail += 1
                mark = "FAIL"
            if i == 1 or i % 10 == 0 or i == n:
                dt = time.time() - t0
                print(
                    f"{i}/{n} ok={ok} fail={fail} last={rec['id']}:{mark} {dt:.1f}s",
                    flush=True,
                )

    print(f"done ok={ok} fail={fail} {time.time()-t0:.1f}s", flush=True)
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
