(() => {
  const clean = (s) => (s || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  const body = clean(document.body?.innerText || "");
  const params = clean(document.querySelector('[data-marker="item-view/item-params"]')?.innerText);
  const title = clean(document.querySelector('[data-marker="item-view/title-info"]')?.innerText);
  const priceText = clean(document.querySelector('[data-marker="item-view/item-price"]')?.innerText);
  const priceMeta = document.querySelector('[itemprop="price"]')?.getAttribute("content") || "";
  const itemIdText = clean(document.querySelector('[data-marker="item-view/item-id"]')?.innerText);
  const dateText = clean(document.querySelector('[data-marker="item-view/item-date"]')?.innerText);
  const desc = clean(document.querySelector('[data-marker="item-view/item-description"]')?.innerText).slice(0, 800);
  const seller = clean(document.querySelector('[data-marker="item-view/seller-info"]')?.innerText).slice(0, 300);
  const land = (params.match(/категор[ия]*\s*земел[ьи]*[:\s]*([^\n]+)/i) || params.match(/\b(ИЖС|ЛПХ|СНТ|ДНП)\b/i) || body.match(/\b(ИЖС|ЛПХ|СНТ|ДНП)\b/))?.[1] || null;
  const year = (params.match(/год[:\s]*(\d{4})/i) || title.match(/\b(19\d{2}|20[0-2]\d)\b/))?.[1] || null;
  const km = Number((body.match(/(\d+)\s*км(?:\s+от\s+МКАД)?/i) || [])[1] || "") || null;
  const area = Number((title.match(/([\d,.]+)\s*м/) || [])[1]?.replace(",", ".")) || null;
  const plot = Number((title.match(/участке\s+([\d,.]+)\s*сот/i) || params.match(/([\d,.]+)\s*сот/) || [])[1]?.replace(",", ".")) || null;
  const comms = [];
  for (const [re, lab] of [
    [/электр/i, "эл."],
    [/газ/i, "газ"],
    [/отопл/i, "отопл."],
    [/канал/i, "канал."],
    [/вод/i, "вода"],
  ]) if (re.test(params + " " + desc.slice(0, 200))) comms.push(lab);
  const reservation = body.match(/(?:товар\s+)?(?:зарезервирован(?:о|а)?|забронирован(?:о|а)?)/i)?.[0] || "";
  const blocked = /доступ ограничен|проверк[аи] безопасности/i.test(document.title + body.slice(0, 200));
  return {
    url: location.href,
    title,
    priceText,
    price: /^\d+$/.test(priceMeta) ? Number(priceMeta) : null,
    params,
    itemIdText,
    dateText,
    desc,
    seller,
    land: land ? String(land).replace(/:.*/, "").trim() : null,
    year,
    km,
    area,
    plot,
    comms,
    reservation,
    blocked,
    pageTitle: document.title,
  };
})()
