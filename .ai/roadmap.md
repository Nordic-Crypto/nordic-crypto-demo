# Roadmap

План развития NordicCrypto. Что сделано, что в работе, что в планах.

## 🔥 СЕЙЧАС (неделя 1)

### Критичные фиксы
- [ ] Fix `setUserState` (verification, card, usd)
- [ ] Fix пустой экран после KYC
- [ ] Logout → landing
- [ ] Клик на лого → главная
- [ ] Тестовые vs реальные клиенты

## 📅 БЛИЖАЙШИЕ 2-3 НЕДЕЛИ

### Auth & Security
- [ ] Forgot password (email code)
- [ ] 2FA на смену пароля
- [ ] 2FA на логин (опционально)
- [ ] Session expiry UI (таймер)

### Email (Resend)
- [ ] Красивые HTML шаблоны:
  - [ ] Welcome
  - [ ] KYC submitted
  - [ ] KYC approved/rejected
  - [ ] Deposit received
  - [ ] Withdrawal sent
  - [ ] Password changed
  - [ ] Login from new device
- [ ] Домен `noreply@nordiccrypto.net` в Resend

### Dashboard
- [ ] Улучшить balance chart (интерактивность)
- [ ] Export transactions (CSV)
- [ ] Search/filter transactions
- [ ] Pagination для txs

## 📅 МЕСЯЦ

### Trading
- [ ] Limit orders (сейчас только market)
- [ ] Stop-loss / take-profit
- [ ] Order history с фильтрами
- [ ] Real-time chart (TradingView)

### Cards
- [ ] 3D-карта с parallax
- [ ] Card limits UI
- [ ] Transactions по карте
- [ ] Apple Pay / Google Pay

### Landing
- [ ] Улучшить глобус (интерактивность)
- [ ] Blog / News секция
- [ ] Pricing (для business)
- [ ] Customer stories

## 📅 3 МЕСЯЦА

### Business accounts
- [ ] Multi-user
- [ ] API access
- [ ] Invoices
- [ ] Bulk payments

### Advanced
- [ ] Lending (up to 8% APY)
- [ ] Recurring payments
- [ ] Multi-currency wallets
- [ ] Physical branches (Stockholm, Oslo, Copenhagen)

## 🎯 ДОЛГОСРОЧНОЕ

- [ ] Мобильное приложение (React Native)
- [ ] Apple Watch / Wear OS
- [ ] API для разработчиков
- [ ] Партнёрская программа
- [ ] Реферальная система

## 📊 Метрики успеха

| Метрика | Сейчас | Цель |
|---------|--------|------|
| Uptime | 99.9% | 99.99% |
| Load time | 2s | <1s |
| Mobile score | 70 | 95+ |
| Bundle size | 500 KB | <300 KB |
| Clients | 47 | 1000+ |
| Monthly volume | $50k | $1M+ |

## ✅ Сделано

- [x] Landing v6.0 (bento, security, coverage)
- [x] Интерактивный 3D глобус (Three.js)
- [x] KYC flow
- [x] Deposits + Approve
- [x] Withdrawals + Approve
- [x] Chat
- [x] Bonus system
- [x] Maintenance mode
- [x] Rate limiting
- [x] Audit log
- [x] Metrics

## 🔄 Как обновлять

После каждой выполненной задачи:
1. Отметить `[x]`
2. Обновить `.ai/known-issues.md`
3. Если большая фича — добавить в раздел "Сделано"
