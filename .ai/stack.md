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
NORDIC_KV — KV namespace binding
NORDIC_R2 — R2 bucket binding
RESEND_API_KEY — Resend email
ETHERSCAN_KEY — Etherscan API
ALLOWED_ORIGINS — CORS whitelist (csv)

🔑 Auth Flow
Client: POST /?action=register → получает token (UUID-UUID)

Token сохраняется в localStorage.session_token

Каждый запрос: POST /?action=... с {token, ...}

Worker: getSession(token) → проверяет session_{token} в KV

Session TTL: 7 дней, fp = sha256(ip + ua)

💾 KV Data Model
users (JSON object) — все пользователи:
{
  "user@email.com": {
    "email": "user@email.com",
    "name": "User Name",
    "role": "user",
    "passwordHash": "sha256...",
    "createdAt": 1234567890,
    "verified": false,
    "deleted": false
  }
}

session_<token> — сессия:
{
  "token": "...",
  "email": "...",
  "role": "user",
  "fp": "sha256",
  "createdAt": 123,
  "expiresAt": 456
}

user_state_<email> — состояние
См. worker-api.md → DEFAULT_STATE

Остальные ключи:
rl_<scope>_<id>              — rate limit bucket
kyc/<email>/<type>_<ts>.jpg  — R2 (документы KYC)
metrics_<date>               — метрики за день
audit_<date>                 — audit log
maintenance_status           — статус техработ
last_prices                  — кэш цен
last_multiPrices             — кэш multi-цен
multiPrices_v2               — кэш multi-цен (новый формат)
