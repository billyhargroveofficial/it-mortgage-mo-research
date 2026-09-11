(() => {
  const clean = (s) => (s || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  const canon = (raw) => {
    try {
      const u = new URL(raw, location.origin);
      if (!/(^|\.)avito\.ru$/i.test(u.hostname)) return null;
      return u.origin + u.pathname;
    } catch {
      return null;
    }
  };
  const items = [...document.querySelectorAll('[data-marker="item"]')].map((el) => {
    const title = el.querySelector('[data-marker="item-title"]');
    const priceMeta = el.querySelector('[itemprop="price"]')?.getAttribute("content") || "";
    const text = clean(el.innerText);
    const kmMatch = text.match(/(\d+)\s*км(?:\s+от\s+МКАД)?/i);
    const landMatch = text.match(/\b(ИЖС|ЛПХ|СНТ|ДНП|садоводств\w*)\b/i);
    const yearMatch = text.match(/\b(19\d{2}|20[0-2]\d)\b/);
    const areaMatch = title?.innerText?.match(/([\d,\.]+)\s*м/);
    const plotMatch = title?.innerText?.match(/участке\s+([\d,\.]+)\s*сот/i) || text.match(/([\d,\.]+)\s*сот/);
    const href = title?.href || "";
    const id = el.getAttribute("data-item-id") || (href.match(/_(\d+)(?:\?|$)/) || [])[1] || "";
    return {
      id,
      title: clean(title?.innerText || ""),
      url: canon(href),
      price: /^\d+$/.test(priceMeta) ? Number(priceMeta) : null,
      km: kmMatch ? Number(kmMatch[1]) : null,
      land: landMatch ? landMatch[1].toUpperCase() : null,
      year: yearMatch ? yearMatch[1] : null,
      area: areaMatch ? Number(areaMatch[1].replace(",", ".")) : null,
      plot: plotMatch ? Number(plotMatch[1].replace(",", ".")) : null,
      reserved: /забронировано/i.test(text),
      sponsored: /продвинут|реклам/i.test(text),
      text: text.slice(0, 500),
    };
  });
  const heading = clean(document.querySelector("h1")?.innerText || "");
  const countText = clean(
    document.querySelector('[data-marker="page-title/count"]')?.innerText || ""
  );
  return {
    url: location.href,
    heading,
    countText,
    n: items.length,
    items,
  };
})()
