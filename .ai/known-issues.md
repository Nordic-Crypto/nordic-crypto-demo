# Known Issues

Обновлено: 2026-10-14

Актуальные баги проекта. **Claude — читай этот файл перед каждой задачей.**

## 🔴 CRITICAL

### 1. `setUserState` затирает `verification`, `card`, `usd`

**Симптомы:**
- Клиент прошёл KYC, сделал депозит $9k → через время при возврате снова просит KYC
- Админка показывает "нет карты"
- Баланс откатывается

**Причина:** в `worker.js` функция `setUserState` не защищает поля от клиента.

**Где:** `worker.js` строка ~530

**Фикс:**
```js
if (session.role !== 'admin') {
  // 🛡️ verification всегда с сервера
  state.verification = serverState.verification || null;
  if (serverState._verificationLocked) {
    state._verificationLocked = true;
    state._verificationLockedAt = serverState._verificationLockedAt;
  }

  // 🛡️ card тоже не трогаем
  if (serverState.card) state.card = serverState.card;

  // 🛡️ usd не откатываем
  if ((serverState.usd || 0) > (state.usd || 0)) {
    state.usd = serverState.usd;
  }
  if ((serverState.btc || 0) > (state.btc || 0)) state.btc = serverState.btc;
  if ((serverState.eth || 0) > (state.eth || 0)) state.eth = serverState.eth;
}
```

**Статус:** ⏳ Не задеплоено

### 2. Пустой экран после KYC submit

**Симптомы:**
- Клиент загружает документы → submit → пустой экран
- Только после F5 появляется pendingScreen

**Причина:** `submitRealVerification` не вызывает `showPendingScreen` сразу.

**Где:** `app.legacy.js` функция `submitRealVerification`

**Фикс:** добавить в конец try-блока после успешного POST:
```js
// Принудительно показать pendingScreen
var _p = document.getElementById('pendingScreen');
if (_p) {
  _p.classList.add('on');
  _p.style.display = 'flex';
  _p.style.zIndex = '9999';
}
```

**Статус:** ⏳ Частично исправлено (в app.legacy.js v7.0.3)

## 🟡 MAJOR

### 3. Logout ведёт на loginScreen вместо landing

**Симптомы:** после `doLogout()` клиент остаётся на `index.html` с логин-формой.

**Фикс:** в `doLogout()` заменить `showLoginScreen()` на:
```js
window.location.href = 'https://nordiccrypto.net/';
```

**Статус:** ⏳ Не исправлено

### 4. Клик на лого не ведёт на главную

**Симптомы:** клик на NordicCrypto в дашборде ничего не делает.

**Фикс:** в `index.html` обернуть лого в `<a href="/">`.

**Статус:** ⏳ Не исправлено

### 5. Нет "Forgot password"

**Симптомы:** клиент забыл пароль → только через support.

**Фикс:** добавить endpoints `sendResetCode`, `verifyResetCode` в воркер + форму в login.

**Статус:** ⏳ TODO

### 6. Нет 2FA на смену пароля

**Симптомы:** password меняется без подтверждения по email.

**Фикс:** добавить отправку кода + проверку.

**Статус:** ⏳ TODO

### 7. Email-шаблоны простые / нет домена в Resend

**Симптомы:**
- Письма приходят с `onboarding@resend.dev` вместо `noreply@nordiccrypto.net`
- Нет красивых HTML-шаблонов

**Фикс:**
1. Добавить домен `nordiccrypto.net` в Resend (верифицировать DNS)
2. Создать 5 HTML-шаблонов (deposit, password, KYC, withdrawal)

**Статус:** ⏳ TODO

## 🟢 MINOR

### 8. Глобус — маркеры крупноваты

**Симптомы:** на "Coverage" секции маркеры городов накладываются.

**Статус:** ✅ Частично исправлено (уменьшены в 2 раза)

### 9. Тестовые vs реальные клиенты

**Симптомы:** FOMO-уведомления показываются реальным клиентам, хотя должны быть только для тестов.

**TODO:** создать список `TEST_EMAILS` в `app.legacy.js`:
```js
var TEST_EMAILS = ['test@test.com', 'demo@...'];
```

**Статус:** ⏳ TODO

### 10. Депозит чек — emailReceipt не подключён к UI

**Симптомы:** endpoint `emailReceipt` есть в воркере, но кнопки "Send receipt" нет.

**Фикс:** добавить кнопку в deposit success screen.

**Статус:** ⏳ TODO

## 📋 Как добавить issue

```markdown
### N. Название

**Симптомы:** что происходит

**Причина:** почему

**Где:** файл + строка

**Фикс:** код или описание

**Статус:** ⏳ Не исправлено / ⏳ В работе / ✅ Исправлено
```

## 🎯 Приоритеты при фиксах

1. **CRITICAL** — потеря данных, security, пустые экраны
2. **MAJOR** — поломанный UX, неправильные данные
3. **MINOR** — визуальные мелочи, оптимизация

**Сначала фиксим CRITICAL.**
