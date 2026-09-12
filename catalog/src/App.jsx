import { useEffect, useMemo, useRef, useState } from "react";
import houses from "./data/houses.json";
import kozelskHouses from "./data/houses-kozelsk.json";
import cityCoords from "./data/city-coords.json";

const PRICE_CHIPS = {
  mo: [
    { id: "all", label: "Все цены" },
    { id: "8-9", label: "8–9 млн" },
    { id: "9-12", label: "9–12 млн" },
    { id: "12-15", label: "12–15 млн" },
  ],
  kozelsk: [
    { id: "all", label: "Все цены" },
    { id: "u3", label: "до 3 млн" },
    { id: "3-6", label: "3–6 млн" },
    { id: "6-9", label: "6–9 млн" },
    { id: "9-18", label: "9–18 млн" },
    { id: "18plus", label: "18+ млн" },
  ],
};

const KM_CHIPS = [
  { id: "all", label: "Любое расстояние" },
  { id: "20", label: "До 20 км" },
  { id: "30", label: "До 30 км" },
  { id: "40", label: "До 40 км" },
];

const LOOK_BADGE = {
  nice: "Топ",
  render: "Рендер",
  junk: "Говно",
  unknown: "Нет фото",
};

const LOOK_RANK = { nice: 0, ok: 1, render: 2, junk: 3, unknown: 4 };

const REGIONS = {
  mo: {
    id: "mo",
    path: "/",
    tab: "Подмосковье",
    houses,
    areaName: "Московская область",
    eyebrow: "Подмосковье · 11 сентября 2026",
    lead: (n) =>
      `${n} домов с землёй ИЖС или ЛПХ, 8–15 млн ₽, примерно до 50 км от МКАД. Показаны сразу все — от топовых до развалюх, отсортированы по качеству.`,
    searchPlaceholder: "Город, например Химки или Чехов",
  },
  kozelsk: {
    id: "kozelsk",
    path: "/kozelsk",
    tab: "Козельск",
    houses: kozelskHouses,
    areaName: "Калужская область",
    eyebrow: "Козельск, Калужская обл. · 11 сентября 2026",
    lead: (n) =>
      `${n} домов с землёй ИЖС или ЛПХ в Козельске и районе. Показаны сразу все — от топовых до развалюх, отсортированы по качеству. Льготный лимит IT-ипотеки — 9 млн ₽, комбо с рыночным хвостом — до 18 млн.`,
    searchPlaceholder: "Поиск по Козельску",
  },
};

function routeFromPath() {
  const p = window.location.pathname.replace(/\/+$/, "");
  const seg = p.split("/").filter(Boolean);
  let region = "mo";
  let id = null;
  if (seg[0] && seg[0].toLowerCase() === "kozelsk") {
    region = "kozelsk";
    if (seg[1] && /^\d+$/.test(seg[1])) id = seg[1];
  } else if (seg[0] && /^\d+$/.test(seg[0])) {
    id = seg[0];
  }
  return { region, id };
}

const BASE_TITLE = "Дома, которые смотрим";

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
  const initialRoute = routeFromPath();
  const [region, setRegion] = useState(initialRoute.region);
  const [price, setPrice] = useState("all");
  const [km, setKm] = useState("all");
  const [land, setLand] = useState("all");
  const [sort, setSort] = useState("look");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [modalOn, setModalOn] = useState(false);
  const [slide, setSlide] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersOn, setFiltersOn] = useState(false);

  const cfg = REGIONS[region];
  const dataset = cfg.houses;
  const priceChips = PRICE_CHIPS[region];
  const regionRef = useRef(region);
  useEffect(() => {
    regionRef.current = region;
  }, [region]);

  useEffect(() => {
    if (!initialRoute.id) return;
    const h = REGIONS[initialRoute.region].houses.find((x) => x.id === initialRoute.id);
    if (!h) return;
    setSlide(0);
    setOpen(h);
    document.title = `${h.title} — ${REGIONS[initialRoute.region].tab}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyDefaults = () => {
    setPrice("all");
    setKm("all");
    setLand("all");
    setSort("look");
    setQ("");
    setOpen(null);
  };

  const switchRegion = (id) => {
    if (id === region) return;
    window.history.pushState({}, "", REGIONS[id].path);
    setRegion(id);
    applyDefaults();
    setFiltersOpen(false);
    document.title = BASE_TITLE;
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    const onPop = () => {
      const r = routeFromPath();
      if (r.region !== regionRef.current) {
        setRegion(r.region);
        applyDefaults();
      }
      if (r.id) {
        const h = REGIONS[r.region].houses.find((x) => x.id === r.id);
        if (h) {
          setSlide(0);
          setOpen(h);
          document.title = `${h.title} — ${REGIONS[r.region].tab}`;
          return;
        }
      }
      setModalOn(false);
      document.title = BASE_TITLE;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openHouse = (h) => {
    setSlide(0);
    setOpen(h);
    document.title = `${h.title} — ${cfg.tab}`;
    window.history.pushState({ modal: h.id }, "", `${cfg.path === "/" ? "" : cfg.path}/${h.id}`);
  };

  const closeHouse = () => {
    setModalOn(false);
    document.title = BASE_TITLE;
    const st = window.history.state;
    if (st && st.modal) window.history.back();
    else window.history.pushState({}, "", cfg.path);
  };

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => setModalOn(true), 20);
    return () => clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (modalOn || !open) return;
    const t = setTimeout(() => setOpen(null), 320);
    return () => clearTimeout(t);
  }, [modalOn, open]);

  useEffect(() => {
    if (!filtersOpen) return;
    const id = setTimeout(() => setFiltersOn(true), 20);
    return () => clearTimeout(id);
  }, [filtersOpen]);

  useEffect(() => {
    if (filtersOn || !filtersOpen) return;
    const t = setTimeout(() => setFiltersOpen(false), 320);
    return () => clearTimeout(t);
  }, [filtersOn, filtersOpen]);

  useEffect(() => {
    if (!open && !filtersOpen) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (filtersOpen) {
        setFiltersOn(false);
        return;
      }
      closeHouse();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, filtersOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") setSlide((s) => s + 1);
      if (e.key === "ArrowLeft") setSlide((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = dataset.filter((h) => {
      if (price !== "all" && h.band !== price) return false;
      if (km !== "all" && (h.km == null || h.km > Number(km))) return false;
      if (land !== "all" && h.land !== land) return false;
      if (query) {
        const hay = `${h.city} ${h.title} ${h.land}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "price") return a.price - b.price || (a.km ?? 99) - (b.km ?? 99);
      if (sort === "area") return (b.area ?? 0) - (a.area ?? 0) || a.price - b.price;
      if (sort === "km") return (a.km ?? 99) - (b.km ?? 99) || a.price - b.price;
      return (LOOK_RANK[a.look] ?? 9) - (LOOK_RANK[b.look] ?? 9) || a.price - b.price;
    });
    return list;
  }, [dataset, price, km, land, sort, q]);

  const cities = useMemo(
    () => [...new Set(dataset.map((h) => h.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru")),
    [dataset],
  );

  const activeCount =
    (price !== "all" ? 1 : 0) +
    (km !== "all" ? 1 : 0) +
    (land !== "all" ? 1 : 0) +
    (sort !== "look" ? 1 : 0) +
    (q.trim() ? 1 : 0);

  const closeFilters = () => setFiltersOn(false);

  return (
    <div className="page">
      <header className="hero">
        <nav className="region-tabs">
          {Object.values(REGIONS).map((r) => (
            <button
              key={r.id}
              className={region === r.id ? "tab on" : "tab"}
              onClick={() => switchRegion(r.id)}
            >
              {r.tab}
              <span className="n">{r.houses.length}</span>
            </button>
          ))}
        </nav>
        <p className="eyebrow">{cfg.eyebrow}</p>
        <h1>Дома, которые смотрим</h1>
        <p className="lead">{cfg.lead(dataset.length)}</p>
      </header>

      <div className="toolbar">
        <button className="filters-btn" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog">
          <span>Фильтры</span>
          {activeCount > 0 && <span className="dot">{activeCount}</span>}
        </button>
        <span className="toolbar-count">
          Показано <b>{filtered.length}</b> из {dataset.length}
        </span>
      </div>

      <section className="grid">
        {filtered.map((h) => (
          <article key={h.id} className="card" onClick={() => openHouse(h)}>
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

      {filtersOpen && (
        <div className={filtersOn ? "filters-drawer on" : "filters-drawer"}>
          <div className="drawer-backdrop" onClick={closeFilters} />
          <aside className="drawer" role="dialog" aria-modal="true" aria-label="Фильтры">
            <div className="drawer-head">
              <h3>Фильтры</h3>
              <button className="drawer-close" onClick={closeFilters} aria-label="Закрыть фильтры">
                ×
              </button>
            </div>
            <div className="drawer-body">
              <p className="drawer-label">Цена</p>
              <div className="chips">
                {priceChips.map((c) => (
                  <button key={c.id} className={price === c.id ? "chip on" : "chip"} onClick={() => setPrice(c.id)}>
                    {c.label}
                  </button>
                ))}
              </div>

              {region === "mo" && (
                <>
                  <p className="drawer-label">Расстояние от МКАД</p>
                  <div className="chips">
                    {KM_CHIPS.map((c) => (
                      <button key={c.id} className={km === c.id ? "chip on" : "chip"} onClick={() => setKm(c.id)}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <p className="drawer-label">Земля</p>
              <div className="chips">
                {["all", "ИЖС", "ЛПХ"].map((id) => (
                  <button key={id} className={land === id ? "chip on" : "chip"} onClick={() => setLand(id)}>
                    {id === "all" ? "Вся земля" : id}
                  </button>
                ))}
              </div>

              <p className="drawer-label">Сортировка</p>
              <label className="sort">
                <span>Сначала</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="look">самые топовые</option>
                  <option value="price">дешевле</option>
                  <option value="area">больше дом</option>
                  {region === "mo" && <option value="km">ближе к Москве</option>}
                </select>
              </label>

              <p className="drawer-label">Поиск</p>
              <input
                className="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={cfg.searchPlaceholder}
                list="cities"
              />
              <datalist id="cities">
                {cities.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="drawer-foot">
              <button className="drawer-apply" onClick={closeFilters}>
                Показать {filtered.length}
              </button>
            </div>
          </aside>
        </div>
      )}

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
              <HouseMap city={open.city} areaName={cfg.areaName} />
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

function HouseMap({ city, areaName }) {
  if (!city) return null;
  const c = cityCoords[city];
  const query = encodeURIComponent(`${city}, ${areaName}`);
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
