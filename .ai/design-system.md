# NordicCrypto — Design System

## 🎨 Цвета

### Основные

```css
:root {
  /* Brand */
  --pri: #00E5FF;       /* Cyan — главный accent */
  --pri-2: #7C3AED;     /* Violet — вторичный */
  --pink: #EC4899;      /* Pink — акцент */

  /* Semantic */
  --green: #10B981;     /* Успех */
  --orange: #F59E0B;    /* Предупреждение */
  --red: #EF4444;       /* Ошибка */

  /* Backgrounds */
  --bg: #05070c;        /* Основной тёмный */
  --bg-2: #0a0f18;
  --panel: #0d131f;
  --panel-2: #111828;

  /* Text */
  --txt: #eef3fa;       /* Основной */
  --mut: #7d8a9e;       /* Приглушённый */
  --mut-2: #4a586b;     /* Ещё темнее */

  /* Borders */
  --bd: rgba(255,255,255,.07);
  --bd-2: rgba(255,255,255,.12);
  --bd-3: rgba(255,255,255,.18);
}
```

### Gradients

```css
/* Главный gradient текста */
background: linear-gradient(100deg, #00e5ff 0%, #7c3aed 45%, #ec4899 90%);

/* Gradient кнопки */
background: linear-gradient(135deg, #00e5ff, #0093d1);

/* Card gradient */
background: radial-gradient(120% 100% at 0% 0%, rgba(124,58,237,.18) 0%, transparent 50%);
```

## 📝 Типография

### Шрифты

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Для чисел и моно-текста */
font-family: 'JetBrains Mono', monospace;
```

**Подключение (Google Fonts):**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
```

### Размеры

| Элемент | Размер | Вес | Letter-spacing |
|---------|--------|-----|----------------|
| Hero H1 | clamp(2.4rem, 5.5vw, 4rem) | 800 | -.045em |
| Section H2 | clamp(1.9rem, 4vw, 2.8rem) | 800 | -.04em |
| Card H3 | 1.12rem | 800 | -.02em |
| Body | 1.02rem | 400 | -.011em |
| Muted | .93rem | 400 | — |
| Small | .75rem | 600 | .02em |
| Tag | .68rem | 800 | .15em |
| Mono | various | 600-800 | — |

## 🔲 Компоненты

### Кнопки

```css
/* Primary */
.btn.primary {
  background: linear-gradient(135deg, var(--pri), #0093d1);
  color: #03121a;
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 700;
  box-shadow: 0 8px 24px -8px rgba(0,229,255,.6);
}

/* Ghost */
.btn.ghost {
  background: rgba(255,255,255,.04);
  color: var(--txt);
  border: 1px solid var(--bd-2);
}

/* XL */
.btn.xl {
  padding: 14px 26px;
  font-size: .95rem;
  border-radius: 12px;
}
```

### Карточки

```css
.card {
  padding: 32px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(19,26,42,.65), rgba(10,15,24,.85));
  border: 1px solid rgba(255,255,255,.06);
  transition: transform .35s cubic-bezier(.2,.8,.2,1), border-color .35s;
}
.card:hover {
  transform: translateY(-4px);
  border-color: rgba(0,229,255,.22);
  box-shadow: 0 30px 60px -30px rgba(0,229,255,.35);
}
```

### Badge / Tag

```css
.tag {
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(0,229,255,.08);
  border: 1px solid rgba(0,229,255,.2);
  font-size: .68rem;
  color: #7dd3fc;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .15em;
}
```

### Input

```css
.inp {
  width: 100%;
  padding: 13px 15px;
  border-radius: 12px;
  background: rgba(7,10,15,.7);
  border: 1px solid var(--bd-2);
  color: var(--txt);
  font-size: .95rem;
}
.inp:focus {
  outline: none;
  border-color: var(--pri);
  box-shadow: 0 0 0 4px rgba(0,229,255,.1);
}
```

## 🎬 Анимации

### Easing

```css
/* Стандартный UI */
cubic-bezier(.2,.8,.2,1)

/* Bounce / pop */
cubic-bezier(.34,1.56,.64,1)

/* Плавный */
cubic-bezier(.4,0,.2,1)
```

### Длительности

| Что | Время |
|-----|-------|
| Hover кнопки | .18s |
| Hover карточки | .35s |
| Modal open | .35s |
| Scroll reveal | .7s |
| Mesh animation | 30-40s |
| Marquee | 35s |
| Shimmer | 6s |

### Ключевые keyframes

```css
@keyframes pulse {
  0%,100% { opacity: 1; transform: scale(1); }
  50%     { opacity: .5; transform: scale(1.35); }
}

@keyframes shimmer {
  to { background-position: 200% center; }
}

@keyframes floatY {
  0%,100% { transform: translateY(0) rotate(-3deg); }
  50%     { transform: translateY(-12px) rotate(-3deg); }
}
```

## 🖼️ Иконки

**Формат:** inline SVG, stroke-based (не fill)
**Стиль:** Lucide-like, 1.6px stroke

**Пример:**
```html
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
  <rect x="2" y="5" width="20" height="14" rx="2"/>
  <path d="M2 10h20"/>
</svg>
```

**НЕ использовать эмодзи** для иконок в новом коде (только в тексте).

## 📐 Отступы / сетка

- **Wrap:** `max-width: 1240px`, `padding: 0 28px` (мобилка `0 20px`)
- **Section:** `padding: 100px 0`
- **Card gap:** `18px`
- **Grid columns:** `repeat(3, minmax(0,1fr))` для bento
- **Grid gap:** `18px`

## 🌊 Glow / тени

```css
/* Cyan glow */
box-shadow: 0 30px 60px -30px rgba(0,229,255,.35);

/* Violet glow */
box-shadow: 0 30px 80px -20px rgba(124,58,237,.5);

/* Card elevated */
box-shadow: 0 40px 80px -30px rgba(0,0,0,.9);
```

## 🎯 Референсы

**Стиль вдохновлён:**
- **Stripe.com** — bento grid, hero
- **Vercel.com** — тёмная тема, глобус
- **Linear.app** — glow, анимации
- **Resend.com** — минимализм
- **Revolut.com** — финтех

**Не копировать напрямую. Только вдохновляться.**

## ⚠️ Правила

1. **Никаких ярких светлых фонов** — только тёмные
2. **Cyan #00E5FF** — только для важных CTA и акцентов
3. **Не более 3 цветов** в одном компоненте
4. **Никаких шрифтов кроме Inter и JetBrains Mono**
5. **Border-radius:** 10px-22px (не круглые, не острые)
6. **Отступы кратны 4px** (4, 8, 12, 16, 20, 24, 28, 32)
