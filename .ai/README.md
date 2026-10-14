# NordicCrypto — AI Context

Эта папка — база знаний для ИИ-агентов, работающих над проектом.

## 📚 Что внутри

| Файл | Назначение |
|------|-----------|
| `stack.md` | Технологии, хостинг, сервисы |
| `conventions.md` | Правила кода (JS, CSS, git) |
| `worker-api.md` | Все endpoints Cloudflare Worker |
| `design-system.md` | Цвета, шрифты, компоненты |
| `user-flows.md` | KYC, депозит, вывод, регистрация |
| `known-issues.md` | Текущие баги и проблемы |
| `roadmap.md` | План развития |
| `agents/*.md` | Промпты для 4 агентов |

## 🎯 Как использовать

### Для Claude.ai / ChatGPT

Перед задачей — скопируй в чат:
1. **Содержимое релевантных .ai файлов** (stack, conventions, + нужный agents/*)
2. **Свою задачу**
3. **Текущий код файла**, который меняем

Тогда ИИ **поймёт контекст** и не сломает проект.

### Для Claude Code / Cursor

Просто открой проект — Claude Code сам читает `.ai/` через MCP или прямо.

### Для n8n / автоматизации

Оркестратор загружает эти файлы как system prompt для агентов.

## 📝 Как обновлять

После каждого крупного изменения:
- Обнови `known-issues.md` (закрытые/новые баги)
- Обнови `roadmap.md` (готовые фичи)
- Если менял API — `worker-api.md`
- Если менял дизайн — `design-system.md`

## 🔗 Ссылки

- **Сайт:** https://nordiccrypto.net
- **Repo:** https://github.com/nordic-crypto/nordic-crypto-demo
- **Worker:** https://nordic-deposit-checker.otis-790.workers.dev

## ⚠️ Секреты НЕ хранить здесь

- API ключи (Resend, Etherscan) → в Cloudflare env
- Пароли → никогда не коммитить
- Токены → только в .env (и он в .gitignore)
