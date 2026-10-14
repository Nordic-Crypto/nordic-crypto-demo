# Code Conventions

Правила для ИИ-агентов, работающих над NordicCrypto.

## 📏 Общие правила

- **Минимальные изменения** — не переписывать файл целиком без причины
- **Не ломать существующее** — проверить перед commit
- **Тестировать в инкогнито** — чтобы избежать кэша
- **Один PR = одна задача** — маленькие понятные изменения
- **Всегда читать `.ai/` перед началом** — там контекст проекта

## 🔤 JavaScript

### Стиль (ОБЯЗАТЕЛЬНО!)

- **ES5-style** — `var`, `function`, без `let`/`const`/arrow/`?.`/`??`
  - **Причина:** совместимость со старыми Safari (iPhone 6, iPad 3-4)
  - **Исключение:** `async/await` можно (уже используется)
  - **Исключение:** template literals можно (уже используются)

**✅ Хорошо:**
```js
function renderCard() {
  var card = st.card;
  if (!card) return;
  var num = formatCardNumber(card.num);
  document.getElementById('cardNum').textContent = num;
}
```

**❌ Плохо:**
```js
const renderCard = () => {
  const card = st?.card;
  if (!card) return;
  const num = formatCardNumber(card?.num);
  document.getElementById('cardNum')?.textContent = num;
};
```

### IIFE wrapper для модулей

```js
(function () {
  'use strict';
  // ... code ...
})();
```

### Async / await

- Можно использовать в `app.legacy.js`, `js/*.js`, `worker.js`
- Обязательно оборачивать в **try/catch**
- Никогда не оставлять `await` без обработки ошибки

```js
async function loadUserState() {
  try {
    var r = await fetch(WORKER_URL + '?action=getUserState', { ... });
    var data = await r.json();
    if (!data.ok) throw new Error(data.error);
    return data;
  } catch (e) {
    console.error('[loadUserState]', e);
    return null;
  }
}
```

### Работа с DOM

- **`$('id')`** = `document.getElementById('id')` (определено в app.legacy.js)
- **`document.querySelectorAll`** для множественных элементов
- **`document.querySelector`** для одного
- **Никогда не использовать jQuery**

### Работа с API

- **Всегда `fetch`** с `{method, headers, body}`
- **Всегда проверять** `data.ok` (worker возвращает `{ok: true/false}`)
- **Retry** на 5xx через `fetchRetry` (есть в landing.js)

```js
var r = await fetchRetry(WORKER_URL + '?action=getUserState', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: token })
});
var data = await r.json();
if (!data.ok) { /* обработать ошибку */ }
```

### Безопасность

- **Всегда** `escapeHtml(userInput)` перед вставкой в HTML
- **Никогда** не использовать `innerHTML` с user input напрямую
- **Никогда** не логировать `password`, `token`, `cvv`

## 🎨 CSS

### Наименование классов (BEM-like)

```
.block                    — компонент
.block-element            — элемент внутри
.block--modifier          — модификатор
```

**Пример:**
```css
.gc-section               /* блок */
.gc-section-header        /* элемент */
.gc-section--active       /* модификатор */

.gc-stat
.gc-stat-value
.gc-stat-label
```

### Переменные в :root

**Все цвета** — только через переменные:

```css
:root {
  --pri: #00E5FF;
  --pri-2: #7C3AED;
  --pink: #EC4899;
  --green: #10B981;
  --orange: #F59E0B;
  --bg: #05070c;
  --txt: #eef3fa;
  --mut: #7d8a9e;
  --bd: rgba(255,255,255,.07);
}

/* ✅ Хорошо */
.btn { background: var(--pri); }

/* ❌ Плохо */
.btn { background: #00E5FF; }
```

### Mobile-first

- **Media queries** — `max-width`, не `min-width`
- **По умолчанию** — мобильный стиль
- **От 640px** — планшетный
- **От 1024px** — десктоп

```css
.card { padding: 16px; }

@media (max-width: 640px) {
  .card { padding: 12px; }
}
```

### !important

**Запрещено** — кроме случаев:
- Перебить `inline-style` от JS
- Перебить чужой CSS-фреймворк

```css
/* ✅ Ок — перебиваем inline */
.hidden-by-fix { display: none !important; }
```

### Анимации

**Стандартные easing:**

```css
/* UI transitions */
transition: all .2s cubic-bezier(.2,.8,.2,1);

/* Modals */
transition: all .35s cubic-bezier(.34,1.56,.64,1);

/* Scroll reveal */
transition: opacity .7s cubic-bezier(.4,0,.2,1);
```

**`prefers-reduced-motion`** — всегда отключать анимации:

```css
@media (prefers-reduced-motion: reduce) {
  .animated-element {
    animation: none !important;
    transition: none !important;
  }
}
```

**`will-change`** — только для реально анимируемых:

```css
/* ✅ Хорошо */
.mesh-1 { will-change: transform; }

/* ❌ Плохо */
* { will-change: transform; }
```

## 🔧 Worker (worker.js)

### Структура endpoint

```js
if (action === 'myAction' && request.method === 'POST') {
  try {
    var body = await request.json();
    var { field1, field2 } = body;

    // 1. Валидация
    if (!field1) return json({ ok: false, error: 'field1 required' });

    // 2. Проверка сессии
    var session = await getSession(body.token);
    if (!session) return json({ ok: false, error: 'Not authenticated' });

    // 3. Rate limit
    var rl = await enforceRateLimit('myAction', session.email);
    if (rl) return rl;

    // 4. Логика
    var state = await getState(session.email);
    state.field1 = field1;
    await putState(session.email, state);

    // 5. Аудит (если админ)
    if (session.role === 'admin') {
      fireAndForget(auditLog(session, 'myAction', { field1 }));
    }

    // 6. Ответ
    return json({ ok: true, data: state });

  } catch (e) {
    return json({ ok: false, error: String(e) });
  }
}
```

### Формат ответа

```js
// ✅ Успех
return json({ ok: true, user: {...} });

// ✅ Частичный успех
return json({ ok: true, alreadyExists: true });

// ❌ Ошибка клиента (400)
return json({ ok: false, error: 'Invalid email' }, 400);

// ❌ Rate limit (429)
return json({ ok: false, error: 'Too many requests' }, 429);

// ❌ Не авторизован (401)
return json({ ok: false, error: 'Not authenticated' }, 401);
```

### Критично (НЕ ЛОМАТЬ!)

**`setUserState`** — должен защищать данные клиента:

```js
if (session.role !== 'admin') {
  // 1. verification — всегда с сервера
  state.verification = serverState.verification || null;
  if (serverState._verificationLocked) {
    state._verificationLocked = true;
    state._verificationLockedAt = serverState._verificationLockedAt;
  }

  // 2. card — не даём затирать
  if (serverState.card) state.card = serverState.card;

  // 3. usd, btc, eth — не даём откатить
  if ((serverState.usd || 0) > (state.usd || 0)) state.usd = serverState.usd;
  if ((serverState.btc || 0) > (state.btc || 0)) state.btc = serverState.btc;
  if ((serverState.eth || 0) > (state.eth || 0)) state.eth = serverState.eth;
}
```

**`approveVerification`** — обязательные поля:

```js
state.verification.status = 'approved';
state._verificationLocked = true;
state._verificationLockedAt = Date.now();
state.user.verified = true;
state.user.accountType = accountType;
```

**Всегда rate limit** на auth endpoints:

```js
var rl = await enforceRateLimit('login', email + '_' + ip);
if (rl) return rl;
```

**Всегда audit log** для админских действий:

```js
fireAndForget(auditLog(session, 'adminAction', { ... }));
```

## 🌳 Git

### Формат коммитов

`type: краткое описание`

**Типы:**

- `feat:` — новая фича
- `fix:` — багфикс
- `chore:` — рутина (обновления, миграции)
- `docs:` — документация
- `style:` — форматирование (не CSS, а whitespace)
- `refactor:` — рефакторинг
- `perf:` — оптимизация
- `test:` — тесты

**Примеры:**

```
feat: добавлен SSE для maintenance mode
fix: setUserState больше не затирает verification
docs: обновлён .ai/worker-api.md
chore: bump version to 7.0.5
style: причёсан landing.css
refactor: вынес escapeHtml в core.js
perf: кэш для multiPrices
```

### Ветки

```
main              — продакшн (автодеплой)
feature/xxx       — новая фича
fix/xxx           — багфикс
hotfix/xxx        — срочный фикс в прод
chore/xxx         — рутина
```

**Создание:**

```bash
git checkout -b feature/globe-improve
```

**Merge в main** — только через Pull Request.

## ⚠️ Чего НЕ делать

### Запрещено

- ❌ Не менять `worker.js` без локального теста в Cloudflare preview
- ❌ Не коммитить `.env`, токены, пароли, ключи
- ❌ Не удалять данные пользователей (даже при рефакторинге)
- ❌ Не ломать `setUserState` защиту (verification, card, usd)
- ❌ Не использовать `innerHTML` с user input
- ❌ Не менять URL worker без одновременного обновления всех модулей
- ❌ Не убирать rate limits
- ❌ Не логировать пароли/токены/cvv
- ❌ Не удалять endpoints (клиенты сломаются)
- ❌ Не менять структуру KV без миграции

### Осторожно

- ⚠️ Изменения в `app.legacy.js` — могут сломать дашборд
- ⚠️ Изменения в `setUserState` — риск потери данных клиентов
- ⚠️ Изменения в `approveVerification` — риск потери KYC статуса
- ⚠️ Изменения в CSS `.hero-video-stage` — влияет на всю hero
- ⚠️ Изменения в `.bento` grid — может расплыться на мобилке

## ✅ Чеклист перед commit

- [ ] Прочитал `.ai/conventions.md` + релевантные файлы
- [ ] Понял что меняю (не переписываю всё)
- [ ] Протестировал в инкогнито
- [ ] Проверил консоль (нет новых ошибок)
- [ ] Не сломал существующие секции
- [ ] Не затронул `worker.js` (если не надо)
- [ ] Мобильная версия работает (375px)
- [ ] Commit message по формату `type: описание`
- [ ] Один PR = одна задача

## 🎯 Приоритеты

При выборе что делать — приоритеты:

1. **CRITICAL** — потеря данных, security, пустые экраны
2. **MAJOR** — поломанный UX, неправильные данные
3. **MINOR** — визуальные мелочи, оптимизация
4. **NICE-TO-HAVE** — новые фичи

**Сначала фиксим 1-2, потом 3-4.**
