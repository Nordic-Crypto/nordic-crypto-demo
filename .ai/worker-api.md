# Worker API — все endpoints

**Base URL:** `https://nordic-deposit-checker.otis-790.workers.dev`
**Version:** v4.4.0
**Все запросы:** `POST ?action=<name>` с JSON body

## 📋 Формат ответа

```js
// Успех
{ "ok": true, ...данные }

// Ошибка
{ "ok": false, "error": "Сообщение" }
```

## 🔐 Auth (public)

### `register`
Регистрация нового пользователя.

**Request:**
```json
{ "email": "user@x.com", "password": "min6", "name": "Имя", "accountType": "banking" }
```

**Response:**
```json
{ "ok": true, "token": "uuid-uuid", "user": { "email": "...", "name": "...", "role": "user", "accountType": "banking" } }
```

### `login`
```json
{ "email": "...", "password": "..." }
```
→ `{ ok: true, token, user }`

### `verify`
Проверка сессии.
```json
{ "token": "..." }
```
→ `{ ok: true, user: { email, role } }`

### `logout`
```json
{ "token": "..." }
```
→ `{ ok: true }`

### `sendCode`
Отправка кода на email (для регистрации).
```json
{ "email": "..." }
```
→ `{ ok: true }`

### `changePassword`
```json
{ "token": "...", "oldPassword": "...", "newPassword": "min6" }
```
→ `{ ok: true }`

### `verifyPassword`
```json
{ "token": "...", "password": "..." }
```
→ `{ ok: true }`

## 📊 State

### `getUserState`
```json
{ "token": "...", "email?": "user@x.com" }
```
→ полный state (см. DEFAULT_STATE ниже)

### `setUserState`
Сохранить state. **Клиент не может затирать** `verification`, `card`, `usd`.

```json
{ "token": "...", "state": {...}, "email?": "...", "force?": bool, "wipeChat?": bool, "wipeNotifs?": bool }
```
→ `{ ok: true, usd: number, saved: "email" }`

### DEFAULT_STATE (полная структура)

```js
{
  usd: 0, btc: 0, eth: 0, btcP: 68000, ethP: 3200, eurR: 0.92, sekR: 10.45,
  currency: 'USD',
  txs: [],
  order: null,
  card: null,
  notifications: [],
  cryptoAddress: null,
  pendingDeposits: [],
  depositVerifications: [],
  user: { verified: false, accountType: null, iban: null },
  chat: [],
  ticket: null,
  typing: { client: false, admin: false },
  verification: null,
  withdrawals: [],
  balanceHistory: [],
  orders: [], openOrders: [], trades: []
}
```

## 💰 Deposits

### `addPendingDeposit`
```json
{ "token": "...", "txHash": "...", "cryptoAmt": 0.5, "symbol": "BTC", "usdValue": 40000, "to": "...", "time": 1234567890 }
```
→ `{ ok: true }` или `{ ok: true, alreadyExists: true }`

### `listPendingDeposits` (admin)
→ `{ ok: true, deposits: [...] }`

### `approvePendingDeposit` (admin)
```json
{ "token": "...", "userEmail": "...", "depositId": "pd_..." }
```
→ `{ ok: true, newBalance: number }`

### `rejectPendingDeposit` (admin)
```json
{ "token": "...", "userEmail": "...", "depositId": "...", "reason": "..." }
```
→ `{ ok: true }`

### `completeDepositSurvey`
```json
{ "token": "...", "depositId": "...", "answers": { source, origin, purpose, declaration } }
```
→ `{ ok: true, usd, btc, eth }`

## 🔍 Blockchain check

### `check` (GET)
```
GET ?action=check&email=user@x.com
```
→ `{ ok: true, result: { btc: [...], eth: [...] } }`

## 🪪 KYC

### `uploadKycDoc`
```json
{ "token": "...", "docType": "passport|selfie|address|id_card|driver_license", "imageBase64": "data:image/jpeg;base64,...", "fileName": "doc.jpg" }
```
→ `{ ok: true, key: "kyc/email/passport_123.jpg", contentType, size }`

### `getKycDoc` (admin)
```json
{ "token": "...", "key": "kyc/..." }
```
→ `{ ok: true, dataUrl: "data:image/...;base64,..." }`

### `submitVerification`
```json
{ "token": "...", "docType": "passport", "docKeys": ["key1", "key2"], "personalInfo": { street, city, zip, country } }
```
→ `{ ok: true }`

### `listVerifications` (admin)
→ `{ ok: true, verifications: [...] }`

### `approveVerification` (admin)
```json
{ "token": "...", "email": "...", "accountType": "banking|exchange" }
```
→ `{ ok: true }`

### `rejectVerification` (admin)
```json
{ "token": "...", "email": "...", "reason": "..." }
```
→ `{ ok: true }`

## 🏦 IBAN

### `setIban` (admin)
```json
{ "token": "...", "email": "...", "iban": "SE...", "swift": "ESSESESSXXX", "bank": "NordicCrypto Bank AB", "country": "SE" }
```
→ `{ ok: true }`

## 💸 Withdraw

### `withdraw`
```json
{ "token": "...", "amount": 1000, "method": "iban|card|crypto", "details": {...} }
```
→ `{ ok: true, withdrawal, usd }`

## 💬 Chat

### `setTyping`
```json
{ "token": "...", "email?": "...", "who": "client|admin", "typing": true }
```

### `sendChatMessage`
```json
{ "token": "...", "email?": "...", "text": "...", "from?": "client|admin", "clientMsgId?": "..." }
```
→ `{ ok: true, message: {...} }`

### `getChat`
```json
{ "token": "...", "email?": "..." }
```
→ `{ ok: true, chat: [...], typing: {...}, ticket: {...} }`

### `markChatRead`
```json
{ "token": "...", "email?": "...", "from?": "client|admin" }
```

## 👤 Admin

### `listUsers` (admin)
→ `{ ok: true, users: [...] }`

### `getUsersBatch` (admin)
→ `{ ok: true, users: [...], count }`

### `updateUserBalance` (admin)
```json
{ "token": "...", "email": "...", "amount": 1000, "note": "Bonus" }
```
→ `{ ok: true, email, oldBalance, amount, newBalance }`

### `sendMessage` (admin)
```json
{ "token": "...", "email": "...", "text": "...", "icon": "📩" }
```

### `setCryptoAddress` (admin)
```json
{ "token": "...", "email": "...", "btc": "...", "eth": "..." }
```

### `adminSetPassword` (admin)
```json
{ "token": "...", "email": "...", "newPassword": "min6" }
```

### `adminResetRateLimit` (admin)
```json
{ "token": "...", "scope?": "login", "identifier?": "user@x.com" }
```

### `getStats` (admin)
→ `{ ok: true, stats: { totalClients, totalBalance, totalTx, totalCrypto: {btc, eth} } }`

### `deleteUser` (admin)
```json
{ "token": "...", "email": "...", "permanent": false }
```

### `restoreUser` (admin)
```json
{ "token": "...", "email": "..." }
```

### `listDeletedUsers` (admin)
→ `{ ok: true, users: [...] }`

## 📈 Rates & Prices

### `rates` (GET)
→ `{ ok: true, rates: { EUR, SEK, NOK, DKK, GBP } }`

### `prices` (GET)
→ `{ ok: true, btc, eth, ts }`

### `multiPrices` (GET)
→ `{ ok: true, coins: [ {symbol, name, usd, change24h, volume24h, icon, source} ], ts }`

## 🔧 Trading

### `trade`
```json
{ "token": "...", "type": "buy|sell|convert", "symbol": "BTC", "amount": 0.5, "price": 84000, "orderType": "market|limit", "limitPrice?": 84000, "clientTradeId?": "t_123", "targetSymbol?": "ETH", "sourceSymbol?": "BTC" }
```
→ `{ ok: true, trade, usd, btc, eth, usdt, sol, bnb }`

### `getOrders`
```json
{ "token": "...", "filter?": "open|filled|cancelled|all", "limit?": 100 }
```

### `cancelOrder`
```json
{ "token": "...", "orderId": "ord_..." }
```

## 🛠️ Maintenance

### `getMaintenanceStatus` (GET)
→ `{ ok: true, maintenance: { active, until?, message?, version? } }`

### `setMaintenance` (admin)
```json
{ "token": "...", "active": true, "duration": 300000, "message": "...", "version": "5.0.0" }
```

### `maintenanceStream` (GET, SSE)
Server-Sent Events поток. Пушит статус каждую секунду + ping.

## 📊 Прочее

### `health` (GET)
→ `{ ok: true, version, ts, kv, r2, resend, etherscan, cors, corsWildcard }`

### `version` (GET)
→ `{ ok: true, version, workerVersion }`

### `notifyAdmin`
```json
{ "token": "...", "text": "...", "icon": "🔔" }
```

### `emailReceipt`
```json
{ "token": "...", "depositId": "..." }
```

## 🚦 Rate Limits

| Endpoint | Max | Window |
|----------|-----|--------|
| `login` | 20 | 15 min |
| `register` | 20 | 60 min |
| `sendCode` | 10 | 15 min |
| `check` | 60 | 1 min |
| `uploadKycDoc` | 50 | 60 min |
| `sendChatMessage` | 120 | 1 min |
| `global` | 600 | 1 min |

## 🔐 CORS

- **Env:** `ALLOWED_ORIGINS` (csv)
- **Wildcard:** если `*` — разрешены все
- **Prod:** `nordiccrypto.net,nordic-crypto.github.io`

## ⚠️ Критичные правила

1. **`setUserState`** — клиент НЕ может затирать `verification`, `card`, `usd`, `btc`, `eth`
2. **`approveVerification`** — устанавливает `_verificationLocked = true`
3. **`submitVerification`** — не снимает lock если уже approved
4. **Все POST** — проверять `session` для защищённых
5. **Admin endpoints** — проверять `session.role === 'admin'`
