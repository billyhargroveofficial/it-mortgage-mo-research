# AGENTS.md — it-mortgage-mo

Репозиторий охоты за домами в ближнем Подмосковье под **IT-ипотеку** и статического каталога для мамы.

Не скилл в `~/.agents/skills/` и не billy-skills-hub. Всё проектное.

Когда задача про поиск/Авито/условия ипотеки — читай скилл

`.grok/skills/it-mortgage-mo-research/SKILL.md`

плюс `ego-browser` и `avito-listing-research`. Этот файл — как трогать репо, каталог, деплой и что уже взрывалось.

## Дерево

```
it-mortgage-mo/
  AGENTS.md                          ← ты здесь
  .grok/skills/it-mortgage-mo-research/
  catalog/                           ← Vite + React 19, это прод
  research/                          ← мелкие новые дампы
```

Симлинк для мышечной памяти: `~/Projects/mo-houses-catalog` → `it-mortgage-mo/catalog`.

Сырьё среза 11.09.2026 (тяжёлое, не в git): `~/.grok/tmp/avito-mo-houses/`.

## Каталог

Путь: `catalog/`. Стек: Vite 7, React 19, без роутера, без бэкенда. Статика на Netlify.

| | |
|---|---|
| Прод | https://doma-podmoskovie.netlify.app |
| Site id | `f385c000-9ab8-4145-9fe7-26aa35070d15` |
| Имя | `doma-podmoskovie` |
| Аккаунт | reflaxess@gmail.com |
| Notion | `3d886534d7d681dcbc4cdae6b8c9cb82` |

```bash
cd catalog
npm install
npm run dev
npm run build
netlify deploy --prod --dir dist --site f385c000-9ab8-4145-9fe7-26aa35070d15
```

`netlify.toml` публикует `dist`. Фото в `public/photos` копируются как есть, cache-control immutable. **Фото не в git** (`catalog/public/photos/` в gitignore) — деплой и `dist` берут их с диска; в репозитории их нет.

### Данные

`catalog/src/data/houses.json` — канон. Поля:

`id, price, title, url, city, km, area, plot, land, year, comms, band, look, media, lookConfidence, lookWhy`

- `id` = Avito item id, он же имя папки фото;
- `band` = `8-9` \| `9-12` \| `12-15`;
- `land` = `ИЖС` \| `ЛПХ`;
- `look` см. скилл vision.

`city-coords.json` — lat/lon города для Яндекс-карты. Не точка дома. Баг: «Троицкое» слишком западное (lon 35.7).

Срез: **203** дома, фото 340 файлов. look: nice 39, ok 66, junk 39, render 10, unknown 49.

Не пересобирать JSON из головы. Мержить скриптом. Не выкидывать 8–8.5, их добирали отдельно.

### UI, которое уже выстрадали — не откатывать

- Сетка карточек, не таблица. Фото первое.
- Карусель: track `translate3d`, transition 0.42s, **без цикличного wrap**.
- Передний план `object-fit: contain`. Пользователь запретил кроп.
- Фон — размытый дубль той же картинки (`blur(28px)` + scale), **не чёрные поля**.
- Стрелки/точки только после eager. IntersectionObserver `rootMargin: 200px` прелоадит остальные jpg.
- Модалка: `open` + `modalOn` (rAF вход, 320ms выход). Клики по оверлею закрывают.
- Карта: iframe Яндекса по координатам города, ссылка «на Яндекс.Картах».
- Фильтры: look (дефолт **Топ / nice**), цена, км, земля, поиск города, сорт.
- Бейджи look только для nice/render/junk/unknown, не для ok.
- Копирайт тона: можно «Говно» на чипе — так просил пользователь; прод для мамы, не размазывать мат по заголовку.

### Не сделано, хотя просили

- **Шаринг карточки URL `/{avitoId}`** + Netlify `/* → /index.html 200`. Прервали. Если делать: SPA fallback в `netlify.toml`, читать id из `location.pathname`, открывать модалку.
- Докачка ~49 обложек и ~92 вторых кадров. Авито на ретраях врал id. Не `unlink` при нуле файлов.
- Полный 12–13.9 млн в Notion (локальный md есть, страница нет).

### Визуальный QA

Пользователь смотрит глазами через **ego-browser**, не через headless-догадки. После деплоя открыть прод, кликнуть карусель, открыть модалку, проверить contain+blur. Скриншоты `catalog/qa-*.png` — старые, в gitignore корня.

Селекторы: не `.card` (203 матча). Для ego: `.grid > .card:first-child`.

## Авито / VPN / браузер — грабли одной строкой

Полный разбор в скилле. Здесь чтобы не наступить, даже если скилл не открыли:

- Авито только через hy2 `91.201.114.192`, иначе QRATOR 429.
- Один таб ego-browser.
- `s=2` = Дороже. Дешевле = `sort/custom-option(1)`, проверять видимый лейбл.
- Не собирать `f=` руками.
- После чекбокса — новые маркеры, не stale `@ref`.
- `waitForSelector` на Авито зависает — лучше timeout + evaluate.
- Галерея: только `extended-gallery/frame-img`, 720–1280, уникальные URL. Не 150px превью.
- Авито может открыть **чужое** объявление. Сверять id в URL.
- Не удалять папку фото, если скачалось 0.

## Vision

`catalog/scripts/classify-looks.py`, модель `deepseek-flash`, thinking off, ключ `~/.config/deepseek.env`. 72 воркера ок. Не коммитить ключ. Прогон 154 домов стоил ~$0.03.

## Notion

Одна страница, не плодить. MCP Notion. Заголовок вида «Дома в Подмосковье под IT‑ипотеку — 8–15 млн ₽ (дата)». Вводный абзац должен говорить правду: 9 млн льгота + рыночный хвост, ИЖС/ЛПХ, не гарантия банка. Accidental `PLACEHOLDER` уже вставляли — не повторять replace по шаблону вслепую.

## Субагенты

Если оркестратор по системным правилам требует Sonnet на детей — так и делать. Глубина делегирования максимум 1. Добыча Авито **не параллелится вкладками**: QRATOR + RAM. Параллелить можно только DeepSeek HTTP.

## Тон

Пользователь говорит матом и хочет «пиздатые новые дома», не риелторский буллшит. В UI для мамы — коротко и ясно. В отчётах не обещать одобрение ипотеки.
