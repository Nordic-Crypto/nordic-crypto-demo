# NordicCrypto — User Flows

Описание всех пользовательских сценариев. Что происходит на каждом шаге.

## 🚀 1. Регистрация

```
[landing.html]
Пользователь кликает "Open account"
   ↓
[modal: registerModal]
Выбирает тип аккаунта: Banking / Exchange
Вводит: имя, email, пароль, подтверждение
   ↓
POST /?action=register
   ↓
Если ok:
  localStorage: session_token, user_email, user_role, user_name, user_account_type
  → showApp() в index.html
   ↓
[index.html]
Проверяет state:
  - KYC approved? → dashboard
  - KYC pending? → pendingScreen
  - KYC rejected? → rejectedScreen
  - Нет KYC? → onboarding (карта) → KYC форма
```

**Важно:**
- Клиент попадает на `index.html` (не на landing)
- Landing — только для незалогиненных

## 🪪 2. KYC (верификация)

```
[index.html]
Форма: verifyScreen (3 шага)
   ↓
ШАГ 1: Выбор типа документа + загрузка
  - Passport / Driver's License / National ID
  - Upload файла (base64)
  - POST /?action=uploadKycDoc
   ↓
ШАГ 2: Selfie
  - Upload selfie
  - POST /?action=uploadKycDoc (docType: 'selfie')
   ↓
ШАГ 3: Адрес
  - Street, City, Zip, Country
   ↓
Клик "Submit →"
   ↓
POST /?action=submitVerification
  body: { token, docType, docKeys: [docKey, selfieKey], personalInfo }
   ↓
state.verification = { status: 'pending', ... }
   ↓
Показать pendingScreen
   ↓
[ПОСЛЕ РЕЛОГИНА]
При showApp(): vStatus === 'pending' → showPendingScreen()
```

**Критично:**
- **НЕ должно быть пустого экрана** после submit
- **showPendingScreen()** вызывается **сразу**, не после F5
- **Проверка при загрузке:** `localStorage['nc_kyc_done_<email>'] === '1'` → pending

### Approve админом:

```
[admin panel]
Verifications → approveKyc(email)
   ↓
POST /?action=approveVerification
   ↓
state.verification.status = 'approved'
state._verificationLocked = true
state.user.verified = true
state.user.accountType = 'banking' | 'exchange'
   ↓
[клиент через polling (5 сек)]
checkVerificationStatus() → { status: 'approved' }
   ↓
Скрыть pendingScreen → показать dashboard
```

## 💰 3. Депозит

```
[dashboard]
Клик "Add funds" → modal
Выбирает метод:
  - Bitcoin (BTC) → показывает адрес
  - Ethereum (ETH) → показывает адрес
  - Bank Transfer (SEPA/SWIFT)
  - Credit Card
   ↓
Если крипто:
  Фоновый polling: GET /?action=check&email=...
  Каждые 15 сек проверяет mempool.space / Etherscan
   ↓
Если найден новый tx:
  Показать depVerifyOverlay
  Шаги:
    1. Откуда отправлено? (personal / exchange / friend / other)
    2. Источник средств? (salary / investment / gift / business)
    3. Подтверждение
   ↓
POST /?action=addPendingDeposit
  body: { token, txHash, cryptoAmt, symbol, usdValue, to, time }
   ↓
state.pendingDeposits.push({ id: 'pd_...', status: 'pending', ... })
   ↓
[admin panel]
Pending deposits → approvePendingDeposit(userEmail, depositId)
   ↓
POST /?action=approvePendingDeposit
   ↓
state.usd += usdValue
state.btc += cryptoAmt (или eth)
state.txs.unshift({...})
state.depositVerifications.push({...})
notifications.unshift('💰 Deposit approved...')
   ↓
[клиент через polling]
refreshBalanceFromServer() → новый баланс
```

## 💸 4. Вывод

```
[dashboard]
Клик "Withdraw" → modal
Вводит:
  - Amount
  - Method: IBAN / Card / Crypto
  - Детали (IBAN → name, iban, swift, bank, country)
   ↓
Валидация (client-side)
   ↓
POST /?action=withdraw
  body: { token, amount, method, details }
   ↓
Worker:
  1. Проверка: amount <= state.usd
  2. state.usd -= amount
  3. state.withdrawals.unshift({ id, status: 'pending', ... })
  4. state.txs.unshift({ amt: -amount, status: 'Under Review', wdId })
  5. Admin notification: '💸 New withdrawal...'
   ↓
Показать txStatus (spinner)
   ↓
[admin panel]
Withdrawals → adminApproveWithdrawal(email, wdId)
   ↓
POST /?action=setUserState (admin force)
  Меняет wd.status на 'approved'
  Добавляет notification
```

## 🔐 5. Смена пароля

```
[dashboard → settings]
Клик "Change password"
   ↓
Форма: current, new, confirm
   ↓
POST /?action=changePassword
  body: { token, oldPassword, newPassword }
   ↓
Worker:
  1. Проверка oldPassword
  2. user.passwordHash = sha256(newPassword)
  3. killUserSessions(email) — разлогинивает везде
   ↓
Ответ: { ok: true }
   ↓
Клиент делает doLogout()
```

**TODO:** добавить 2FA (email code)

## 🆘 6. Forgot password (TODO)

**Сейчас:** только через support.

**Нужно:**
```
[login screen]
Клик "Forgot password?"
   ↓
Форма: email
   ↓
POST /?action=sendResetCode
  → Resend отправляет 6-значный код
   ↓
Форма: код + новый пароль
   ↓
POST /?action=verifyResetCode
  body: { email, code, newPassword }
   ↓
Worker:
  1. Проверить код (TTL 15 мин)
  2. user.passwordHash = sha256(newPassword)
  3. Удалить код
   ↓
Ответ: { ok: true }
   ↓
Клиент логинится с новым паролем
```

## 🚪 7. Logout

**СЕЙЧАС:** `doLogout()` → `showLoginScreen()` (index.html)

**НАДО:** → `landing.html` (главная страница сайта)

**Фикс:**
```js
async function doLogout() {
  // ... очистка сессии ...
  window.location.href = 'https://nordiccrypto.net/';
}
```

## 🎯 8. Физическая карта

```
[dashboard → Order New Card]
Форма:
  - Full name
  - Card type: Metal / Gold
  - Country, City, Street, Zip, Phone
   ↓
placeOrder() в app.legacy.js
  st.order = { id: 'NC-2026-XXX', name, address, createdAt }
   ↓
saveToServer()
   ↓
renderOrder() → показывает tracking
   ↓
Прогресс по дням:
  День 0: Order Received
  День 3: Card Minted
  День 6: Packed
  День 14: In Transit
  День 25: Out for Delivery
  День 30: Delivered
```

## 💬 9. Live chat

```
[dashboard]
Клик на FAB (chat toggle)
   ↓
Если нет ticket:
  Форма: email, topic, priority, описание
  → startTicket()
  → POST /?action=setUserState (с новым ticket)
   ↓
Если есть ticket:
  Показать chatConversation
   ↓
Polling каждые 2 сек (если открыт):
  GET /?action=getUserState → fresh.chat
   ↓
Если новый msg от admin:
  playChatSound() + notification
   ↓
sendChatMsg() → POST /?action=sendChatMessage
```

## 🛠️ 10. Maintenance mode

```
[admin panel → System]
Клик "Quick Update" (5-15 мин)
   ↓
POST /?action=setMaintenance
  body: { token, active: true, duration: 15*60*1000, message: '...' }
   ↓
Worker: сохранён в KV
   ↓
[все клиенты] SSE /?action=maintenanceStream
  → push { type: 'status', maintenance: {active: true, until} }
   ↓
Показать maintenance screen поверх всего
   ↓
Когда время истекло:
  Worker удаляет maintenance_status
  → push { maintenance: {active: false} }
   ↓
Скрыть экран, вернуть клиента в дашборд
```

## ⚠️ Известные проблемы

1. **Пустой экран после KYC submit** — `showPendingScreen` не срабатывает сразу (F5 решает)
2. **Verification затирается** при `setUserState` — воркер должен защищать (см. `known-issues.md`)
3. **Logout → login** вместо landing
4. **Card затирается** тем же багом что и verification
5. **USD откатывается** иногда

## 🎯 Критичные правила

1. **Всегда показывать экран сразу** — не ждать F5
2. **Всегда защищать critical данные** (`verification`, `card`, `usd`, `btc`, `eth`)
3. **Всегда обрабатывать ошибки** — не оставлять клиента в пустоте
4. **Всегда проверять** `session_token` — редирект на landing если нет
5. **Polling** — использовать `visibilitychange` для pause/resume
