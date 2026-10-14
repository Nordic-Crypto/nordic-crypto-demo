# NordicCrypto — Tech Stack

## 🎨 Frontend

| Компонент | Технология |
|-----------|-----------|
| Язык | Vanilla JavaScript (ES5-style: `var`, `function`) |
| Стили | Чистый CSS, без препроцессоров |
| Анимации | CSS keyframes + rAF для JS |
| Хостинг | GitHub Pages |
| CDN | jsDelivr (Three.js, Three-globe) |
| Шрифты | Google Fonts (Inter + JetBrains Mono) |

**Файлы:**
- `landing.html` — публичный лендинг
- `index.html` — дашборд после логина
- `app.js` — загрузчик модулей (модульный loader)
- `app.legacy.js` — основной код дашборда (Part A-D)
- `js/*.js` — модули (KYC, deposit, withdraw, chat, bonus, ...)
- `css/landing.css` — стили лендинга
- `css/trade-terminal.css` — стили торговли
- `css/withdraw-flow.css` — стили вывода

## ⚙️ Backend

| Компонент | Технология |
|-----------|-----------|
| Runtime | Cloudflare Workers |
| URL | `https://nordic-deposit-checker.otis-790.workers.dev` |
| Файл | `worker.js` (один файл, ~1500 строк) |
| Версия | v4.4.0 |

**Storage:**
- `NORDIC_KV` — KV storage (users, sessions, states, rates, cache)
- `NORDIC_R2` — R2 storage (KYC документы, image/*)

**External APIs:**
- **Resend** — отправка email (`RESEND_API_KEY`)
- **Etherscan** — проверка ETH транзакций (`ETHERSCAN_KEY`)
- **mempool.space** — проверка BTC (без ключа)
- **CoinGecko** — крипто-курсы (без ключа)
- **Coinbase** — резервный источник курсов (без ключа)

## 🔐 Environment Variables (Cloudflare)
