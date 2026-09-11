import { useEffect, useMemo, useRef, useState } from "react";
import houses from "./data/houses.json";
import cityCoords from "./data/city-coords.json";

const PRICE_CHIPS = [
  { id: "all", label: "Все цены" },
  { id: "8-9", label: "8–9 млн" },
  { id: "9-12", label: "9–12 млн" },
  { id: "12-15", label: "12–15 млн" },
];

const KM_CHIPS = [
  { id: "all", label: "Любое расстояние" },
  { id: "20", label: "До 20 км" },
  { id: "30", label: "До 30 км" },
  { id: "40", label: "До 40 км" },
];

const LOOK_CHIPS = [
  { id: "nice", label: "Топ" },
  { id: "live", label: "Живые" },
  { id: "ok", label: "Обычные" },
  { id: "render", label: "Рендеры" },
  { id: "junk", label: "Говно" },
  { id: "unknown", label: "Без фото" },
  { id: "all", label: "Все" },
];

const LOOK_BADGE = {
  nice: "Топ",
  render: "Рендер",
  junk: "Говно",
  unknown: "Нет фото",
};

function matchesLook(h, look) {
  if (look === "all") return true;
  if (look === "live") return h.look === "nice" || h.look === "ok";
  return h.look === look;
}

function formatPrice(n) {
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
}

function formatShort(n) {
  const m = n / 1_000_000;
  return Number.isInteger(m) ? `${m} млн` : `${m.toFixed(2).replace(".", ",")} млн`;
}

function photoList(id) {
  return [0, 1, 2, 3].map((i) => `/photos/${id}/${i}.jpg`);
}

function PhotoStrip({ id, alt, className, showNav, slide, onSlide, eager }) {
  const srcs = photoList(id);
  const [ok, setOk] = useState([true, true, true, true]);
  const [i, setI] = useState(slide ?? 0);
  const startX = useRef(null);
  const moved = useRef(false);
  const visible = srcs.filter((_, n) => ok[n]);
  const n = visible.length;
  const cur = n ? Math.min(slide ?? i, n - 1) : 0;

  const setCur = (next) => {
    const v = Math.max(0, Math.min(n - 1, next));
    setI(v);
    onSlide?.(v);
  };

  const go = (dir, e) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (n < 2 || !eager) return;
    setCur(cur + dir);
  };

  if (n === 0) {
    return (
      <div className={`ph ph-empty ${className || ""}`} aria-hidden="true">
        <span>нет фото</span>
      </div>
    );
  }

  return (
    <div
      className={`carousel ${className || ""}`}
      onPointerDown={(e) => {
        startX.current = e.clientX;
        moved.current = false;
      }}
      onPointerMove={(e) => {
        if (startX.current != null && Math.abs(e.clientX - startX.current) > 12) moved.current = true;
      }}
      onPointerUp={(e) => {
        if (startX.current == null) return;
        const dx = e.clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) > 40) {
          e.stopPropagation();
          go(dx < 0 ? 1 : -1);
        }
      }}
      onClick={(e) => {
        if (moved.current) {
          e.stopPropagation();
          moved.current = false;
        }
      }}
    >
      <div className="track" style={{ transform: `translate3d(-${cur * 100}%,0,0)` }}>
        {(eager ? visible : visible.slice(0, 1)).map((src, idx) => (
          <div className="slide" key={src}>
            <img className="bg" src={src} alt="" draggable="false" aria-hidden="true" />
            <img
              className="fg"
              src={src}
              alt={idx === cur ? alt : ""}
              draggable="false"
              loading="eager"
              onError={() => {
                const abs = srcs.indexOf(src);
                setOk((prev) => prev.map((v, nIdx) => (nIdx === abs ? false : v)));
              }}
            />
          </div>
        ))}
      </div>
      {n > 1 && showNav && eager && (
        <>
          <button className="card-arrow prev" aria-label="Предыдущее фото" disabled={cur === 0} onClick={(e) => go(-1, e)}>
            ‹
          </button>
          <button className="card-arrow next" aria-label="Следующее фото" disabled={cur === n - 1} onClick={(e) => go(1, e)}>
            ›
          </button>
          <div className="dots">
            {visible.map((_, nIdx) => (
              <button
                key={nIdx}
                className={nIdx === cur ? "dot on" : "dot"}
                aria-label={`Фото ${nIdx + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCur(nIdx);
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CardCarousel({ id, alt }) {
  const ref = useRef(null);
  const [hot, setHot] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setHot(true);
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="carousel-host">
      <PhotoStrip id={id} alt={alt} showNav eager={hot} />
    </div>
  );
}

export default function App() {
  const [price, setPrice] = useState("all");
  const [km, setKm] = useState("all");
  const [land, setLand] = useState("all");
  const [look, setLook] = useState("nice");
  const [sort, setSort] = useState("price");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [modalOn, setModalOn] = useState(false);
  const [slide, setSlide] = useState(0);

  const openHouse = (h) => {
    setSlide(0);
    setOpen(h);
  };

  const closeHouse = () => setModalOn(false);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setModalOn(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (modalOn || !open) return;
    const t = setTimeout(() => setOpen(null), 320);
    return () => clearTimeout(t);
  }, [modalOn, open]);

  const lookCounts = useMemo(() => {
    const query = q.trim().toLowerCase();
    const base = houses.filter((h) => {
      if (price !== "all" && h.band !== price) return false;
      if (km !== "all" && (h.km == null || h.km > Number(km))) return false;
      if (land !== "all" && h.land !== land) return false;
      if (query) {
        const hay = `${h.city} ${h.title} ${h.land}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
    const n = (id) => base.filter((h) => matchesLook(h, id)).length;
    return Object.fromEntries(LOOK_CHIPS.map((c) => [c.id, n(c.id)]));
  }, [price, km, land, q]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const rank = { nice: 0, ok: 1, render: 2, junk: 3, unknown: 4 };
    let list = houses.filter((h) => {
      if (price !== "all" && h.band !== price) return false;
      if (km !== "all" && (h.km == null || h.km > Number(km))) return false;
      if (land !== "all" && h.land !== land) return false;
      if (!matchesLook(h, look)) return false;
      if (query) {
        const hay = `${h.city} ${h.title} ${h.land}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "look") return (rank[a.look] ?? 9) - (rank[b.look] ?? 9) || a.price - b.price;
      if (sort === "km") return (a.km ?? 99) - (b.km ?? 99) || a.price - b.price;
      if (sort === "area") return (b.area ?? 0) - (a.area ?? 0) || a.price - b.price;
      return a.price - b.price || (a.km ?? 99) - (b.km ?? 99);
    });
    return list;
  }, [price, km, land, look, sort, q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeHouse();
      if (e.key === "ArrowRight") setSlide((s) => s + 1);
      if (e.key === "ArrowLeft") setSlide((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const cities = useMemo(
    () => [...new Set(houses.map((h) => h.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru")),
    [],
  );

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">Подмосковье · 11 сентября 2026</p>
        <h1>Дома, которые смотрим</h1>
        <p className="lead">
          {houses.length} домов с землёй ИЖС или ЛПХ, 8–15 млн ₽, примерно до 50 км от МКАД.
          Фото прогнал через нейросеть: отдельно топ, обычные, рендеры и развалюхи.
        </p>
      </header>

      <div className="filters">
        <div className="chips look-chips">
          {LOOK_CHIPS.map((c) => (
            <button
              key={c.id}
              className={look === c.id ? `chip on look-${c.id}` : `chip look-${c.id}`}
              onClick={() => setLook(c.id)}
            >
              {c.label}
              <span className="n">{lookCounts[c.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="chips">
          {PRICE_CHIPS.map((c) => (
            <button key={c.id} className={price === c.id ? "chip on" : "chip"} onClick={() => setPrice(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="chips">
          {KM_CHIPS.map((c) => (
            <button key={c.id} className={km === c.id ? "chip on" : "chip"} onClick={() => setKm(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="row">
          <div className="chips">
            {["all", "ИЖС", "ЛПХ"].map((id) => (
              <button key={id} className={land === id ? "chip on" : "chip"} onClick={() => setLand(id)}>
                {id === "all" ? "Вся земля" : id}
              </button>
            ))}
          </div>
          <label className="sort">
            <span>Сначала</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="price">дешевле</option>
              <option value="look">сначала топ</option>
              <option value="km">ближе к Москве</option>
              <option value="area">больше дом</option>
            </select>
          </label>
        </div>
        <input
          className="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Город, например Химки или Чехов"
          list="cities"
        />
        <datalist id="cities">
          {cities.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <p className="count">
          Показано <b>{filtered.length}</b> из {houses.length}
        </p>
      </div>

      <section className="grid">
        {filtered.map((h) => (
          <article
            key={h.id}
            className="card"
            onClick={() => openHouse(h)}
          >
            <div className="card-photo">
              <CardCarousel id={h.id} alt={h.title} />
              {LOOK_BADGE[h.look] && <div className={`badge look ${h.look}`}>{LOOK_BADGE[h.look]}</div>}
              <div className="badge">{formatShort(h.price)}</div>
              {h.km != null && <div className="badge km">{h.km} км</div>}
            </div>
            <div className="card-body">
              <h2>{h.city}</h2>
              <p className="meta">
                {h.area ? `${h.area} м²` : "дом"}
                {h.plot ? ` · ${h.plot} сот.` : ""}
                {h.land ? ` · ${h.land}` : ""}
                {h.year ? ` · ${h.year}` : ""}
              </p>
              <p className="price">{formatPrice(h.price)}</p>
            </div>
          </article>
        ))}
      </section>

      {filtered.length === 0 && <p className="empty">Ничего не нашлось — снимите фильтр или поменяйте город.</p>}

      {open && (
        <div className={modalOn ? "modal on" : "modal"} onClick={closeHouse}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={closeHouse} aria-label="Закрыть">
              ×
            </button>
            <Gallery id={open.id} title={open.title} slide={slide} setSlide={setSlide} />
            <div className="sheet-body">
              <p className="eyebrow">{open.land} · {open.city}{LOOK_BADGE[open.look] ? ` · ${LOOK_BADGE[open.look]}` : ""}</p>
              <h3>{open.title}</h3>
              <p className="price big">{formatPrice(open.price)}</p>
              {open.lookWhy && <p className="look-why">{open.lookWhy}</p>}
              <ul className="specs">
                {open.km != null && <li>{open.km} км от МКАД</li>}
                {open.area && <li>дом {open.area} м²</li>}
                {open.plot && <li>участок {open.plot} сот.</li>}
                {open.year && <li>год {open.year}</li>}
                {open.comms && <li>{open.comms}</li>}
              </ul>
              <HouseMap city={open.city} />
              <a className="avito" href={open.url} target="_blank" rel="noreferrer">
                Открыть на Авито
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Gallery({ id, title, slide, setSlide }) {
  return (
    <div className="gallery">
      <PhotoStrip
        id={id}
        alt={title}
        showNav
        eager
        slide={slide}
        onSlide={setSlide}
      />
    </div>
  );
}

function HouseMap({ city }) {
  if (!city) return null;
  const c = cityCoords[city];
  const query = encodeURIComponent(`${city}, Московская область`);
  const src = c
    ? `https://yandex.ru/map-widget/v1/?ll=${c.lon},${c.lat}&z=12&pt=${c.lon},${c.lat},pm2rdm&l=map`
    : `https://yandex.ru/map-widget/v1/?text=${query}&z=12`;
  const open = c
    ? `https://yandex.ru/maps/?ll=${c.lon},${c.lat}&z=13&pt=${c.lon},${c.lat}`
    : `https://yandex.ru/maps/?text=${query}`;
  return (
    <div className="map-wrap">
      <iframe title={`Карта: ${city}`} src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      <a className="map-link" href={open} target="_blank" rel="noreferrer">
        {city} на Яндекс.Картах
      </a>
    </div>
  );
}
