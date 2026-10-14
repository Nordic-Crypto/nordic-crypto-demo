# Known Issues

Обновлено: 2026-10-14 (вечер)

Актуальные баги проекта. **Claude — читай этот файл перед каждой задачей.**

Версия воркера: **v4.4.1** (после security-фиксов).

---

## ✅ ЗАКРЫТО (2026-10-14) — 5 критичных уязвимостей

### C1. Балансы можно создать из воздуха ✅
**Было:** клиент присылал `usd: 999999999` через `setUserState` → сохранялось.
**Фикс:** в `setUserState`, блок `if (session.role !== 'admin')` — балансы (`usd`, `btc`, `eth`, `usdt`, `sol`, `bnb`) берутся ТОЛЬКО с сервера.
**Файл:** `worker.js`, `setUserState`.
**Проверено:** Patch 1 PASS (`usd=1000` после попытки выставить `999999999`).

### C2. Двойное зачисление депозита ✅
**Было:** `approvePendingDeposit` + `completeDepositSurvey` оба зачисляли.
**Фикс:**
- `approvePendingDeposit`: проверка `if (pd.creditedAt)` перенесена В НАЧАЛО, до зачисления.
- `completeDepositSurvey`: убрано всё зачисление, только сохранение `surveyAnswers`.

**Проверено:** Тест 2 PASS (`Already credited`, баланс не удвоился), Patch 3 PASS.

### C3. Клиент подставляет `pendingDeposits: status: 'approved'` ✅
**Фикс:** `pendingDeposits` мержатся с защитой `approved → pending` не откатывается. `depositVerifications` — только с сервера.
**Проверено:** Patch 3 PASS.

### C4. `_verificationLocked` можно снять ✅
**Было:** `delete state._verificationLocked` в `submitVerification` до проверки.
**Фикс:** `submitVerification` — проверка `if (state._verificationLocked && state.verification && state.verification.status === 'approved')` стоит ДО перезаписи `state.verification`.
**Проверено:** Patch 4 PASS.

### C5. Клиент перезаписывает `txs`, `withdrawals`, `trades`, `orders`, `openOrders`, `depositVerifications`, `cryptoAddress`, `user` ✅
**Фикс:** все эти поля для НЕ-админа берутся ТОЛЬКО с сервера в `setUserState`.
**Проверено:** Patch 1 + Patch 3 PASS.

---

## 🔴 CRITICAL (открыто)

### 1. Пустой экран после KYC submit

**Симптомы:**
- Клиент загружает документы → submit → пустой экран
- Только после F5 появляется pendingScreen
- В некоторых случаях клиент застревает на pendingScreen даже при `verification.status === 'approved'`

**Причина (вероятная):**
- `submitRealVerification` не вызывает `showPendingScreen` сразу.
- Логика выбора экрана смотрит на `st.user.verified`, а не на `st.verification.status`, из-за чего при approve + `user.verified=false` показывается pendingScreen.

**Где:**
- `app.legacy.js`, функция `submitRealVerification`
- `app.legacy.js` / `js/kyc-fix.js` — логика выбора экрана

**Фикс (черновик):**

1. В `submitRealVerification` после успешного POST:

```js
var _p = document.getElementById('pendingScreen');
if (_p) {
  _p.classList.add('on');
  _p.style.display = 'flex';
  _p.style.zIndex = '9999';
}
В логике экрана проверять st.verification.status, а не st.user.verified:

js
var kycStatus = (st.verification && st.verification.status) || null;
if (kycStatus === 'approved') showScreen('dashboardScreen');
else if (kycStatus === 'pending') showScreen('pendingScreen');
else showScreen('kycScreen');
Статус: ⏳ В работе (частично исправлено в app.legacy.js v7.0.3)

🟡 MAJOR (открыто)
2. Logout ведёт на loginScreen вместо landing
Симптомы: после doLogout() клиент остаётся на index.html с логин-формой.
Фикс: в doLogout() заменить showLoginScreen() на:

js
window.location.href = 'https://nordiccrypto.net/';
Статус: ⏳ Не исправлено

3. Клик на лого не ведёт на главную
Симптомы: клик на NordicCrypto в дашборде ничего не делает.
Фикс: в index.html обернуть лого в <a href="/">.
Статус: ⏳ Не исправлено

4. Нет "Forgot password"
Симптомы: клиент забыл пароль → только через support.
Фикс: добавить endpoints sendResetCode, verifyResetCode в воркер + форму в login.
Статус: ⏳ TODO

5. Нет 2FA на смену пароля
Симптомы: password меняется без подтверждения по email.
Фикс: добавить отправку кода + проверку.
Статус: ⏳ TODO

6. Email-шаблоны простые / нет домена в Resend
Симптомы:

Письма приходят с onboarding@resend.dev вместо noreply@nordiccrypto.net

Нет красивых HTML-шаблонов

Фикс:

Добавить домен nordiccrypto.net в Resend (верифицировать DNS)

Создать 5 HTML-шаблонов (deposit, password, KYC, withdrawal)

Статус: ⏳ TODO

🟢 MINOR (открыто)
7. Глобус — маркеры крупноваты
Статус: ✅ Частично исправлено (уменьшены в 2 раза)

8. Тестовые vs реальные клиенты
Симптомы: FOMO-уведомления показываются реальным клиентам.
TODO: создать список TEST_EMAILS в app.legacy.js:

js
var TEST_EMAILS = ['test@test.com', 'demo@...'];
Статус: ⏳ TODO

9. Депозит чек — emailReceipt не подключён к UI
Симптомы: endpoint emailReceipt есть в воркере, но кнопки "Send receipt" нет.
Фикс: добавить кнопку в deposit success screen.
Статус: ⏳ TODO

📋 Как добавить issue
markdown
### N. Название

**Симптомы:** что происходит

**Причина:** почему

**Где:** файл + строка

**Фикс:** код или описание

**Статус:** ⏳ Не исправлено / ⏳ В работе / ✅ Исправлено
🎯 Приоритеты при фиксах
CRITICAL — потеря данных, security, пустые экраны

MAJOR — поломанный UX, неправильные данные

MINOR — визуальные мелочи, оптимизация

Сначала фиксим CRITICAL.
