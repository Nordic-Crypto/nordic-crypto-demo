/* ============================================================
   NORDIC CRYPTO — CHAT-FIX.JS v3.0 (KV Compatible)
   Работает с твоим Worker на базе KV (без Durable Objects)
   ============================================================ */
(function () {
  'use strict';
  if (window.__ncChatV3) return;
  window.__ncChatV3 = true;

  const WORKER = 'https://nordic-deposit-checker.otis-790.workers.dev';
  let currentTicket = null;
  let isPolling = false;
  let pollTimer = null;

  // Хелперы
  const $ = (id) => document.getElementById(id);
  const token = () => localStorage.getItem('session_token');
  const email = () => (window.adminViewingEmail || localStorage.getItem('user_email') || '').toLowerCase();

  // Получить текущее время
  function fmtTime(ts) {
    try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
  }

  // Экранирование HTML
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ==========================================
  // ОТПРАВКА СООБЩЕНИЯ
  // ==========================================
  window.sendChatMsg = function () {
    const input = $('chatInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    input.value = ''; // Очищаем сразу
    input.focus();

    const isAdmin = !!window.adminViewingEmail;
    const from = isAdmin ? 'admin' : 'client';
    const targetEmail = email();
    const clientMsgId = 'c_' + Date.now();

    // 1. Оптимистично рисуем сообщение
    renderMessage({ from, text, ts: Date.now(), read: false }, true);

    // 2. Отправляем на сервер
    fetch(WORKER + '?action=sendChatMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token(),
        email: targetEmail,
        text: text,
        from: from,
        clientMsgId: clientMsgId
      })
    })
    .then(r => r.json())
    .then(d => {
      if (d.ok) {
        // Успешно отправлено, следующий поллинг подтянет статус "прочитано"
        pollChat(true);
      } else {
        console.error('Chat error:', d.error);
        alert('Ошибка отправки: ' + (d.error || 'Неизвестно'));
      }
    })
    .catch(e => {
      console.error(e);
      alert('Ошибка сети при отправке сообщения');
    });
  };

  // ==========================================
  // СТАРТ ЧАТА (Создание тикета)
  // ==========================================
  window.startTicket = function () {
    const emailInput = $('tkEmail');
    const topicSelect = $('tkTopic');
    const descInput = $('tkDesc');
    
    if (!emailInput || !topicSelect || !descInput) return;
    
    const contact = emailInput.value.trim();
    const topic = topicSelect.value;
    const desc = descInput.value.trim();

    if (!contact || !desc) {
      alert('Пожалуйста, заполните email и описание проблемы.');
      return;
    }

    // Формируем красивое первое сообщение
    const text = `[ТИКЕТ: ${topic.toUpperCase()}]\n\nКонтакт: ${contact}\n\n${desc}`;
    
    // Переключаем интерфейс на окно чата
    const form = $('chatTicketForm');
    const conv = $('chatConversation');
    if (form) form.style.display = 'none';
    if (conv) conv.style.display = 'flex';

    // Отправляем как обычное сообщение
    const fakeInput = $('chatInput');
    if (fakeInput) {
      fakeInput.value = text;
      window.sendChatMsg();
    }
    
    // Запускаем поллинг
    pollChat(true);
  };

  // ==========================================
  // ОТРИСОВКА СООБЩЕНИЙ
  // ==========================================
  function renderMessage(msg, isOptimistic = false) {
    const box = $('chatMessages');
    if (!box) return;

    const isAdmin = !!window.adminViewingEmail;
    const isMine = (msg.from === 'admin' && isAdmin) || (msg.from === 'client' && !isAdmin);
    
    // Удаляем заглушку "No messages"
    const welcome = box.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    const div = document.createElement('div');
    div.className = 'chat-msg ' + (isMine ? 'client' : 'admin');
    if (isOptimistic) div.style.opacity = '0.6';

    const bubble = `<div class="chat-bubble">${esc(msg.text).replace(/\n/g, '<br>')}</div>`;
    const meta = `<div class="chat-msg-meta">${isMine ? 'Вы' : (isAdmin ? 'Клиент' : 'Elena')} • ${fmtTime(msg.ts || Date.now())} ${isOptimistic ? '<span>⏳</span>' : (msg.read && isMine ? '<span style="color:#47dcff">✓✓</span>' : '')}</div>`;

    div.innerHTML = `<div>${bubble}${meta}</div>`;
    box.appendChild(div);
    
    // Скролл вниз
    box.scrollTop = box.scrollHeight;
  }

  function renderFullChat(chat) {
    const box = $('chatMessages');
    if (!box) return;
    
    box.innerHTML = '';
    
    if (!chat || chat.length === 0) {
      box.innerHTML = `<div class="chat-welcome"><div class="chat-welcome-name">Elena Bergström</div><div class="chat-welcome-text">Hi! How can I help you today?</div></div>`;
      return;
    }

    chat.forEach(msg => renderMessage(msg, false));
    box.scrollTop = box.scrollHeight;
  }

  // ==========================================
  // ПОЛЛИНГ (Получение новых сообщений)
  // ==========================================
  function pollChat(force = false) {
    if (!token() || !email()) return;
    if (isPolling && !force) return;
    isPolling = true;

    const isAdmin = !!window.adminViewingEmail;
    const targetEmail = email();

    fetch(WORKER + '?action=getChat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token(), email: targetEmail })
    })
    .then(r => r.json())
    .then(d => {
      isPolling = false;
      if (!d.ok) return;

      // 1. Рисуем сообщения
      if (d.chat && d.chat.length > 0) {
        renderFullChat(d.chat);

        // Если мы клиент и видим непрочитанные от админа — помечаем прочитанными
        if (!isAdmin && d.chat.some(m => m.from === 'admin' && !m.read)) {
          markAsRead();
        }
      }

      // 2. Переключаем экраны, если есть история
      if (d.chat && d.chat.length > 0) {
        const form = $('chatTicketForm');
        const conv = $('chatConversation');
        if (form && form.style.display !== 'none') {
          form.style.display = 'none';
          conv.style.display = 'flex';
          // Показываем тему тикета в шапке
          const firstMsg = d.chat[0].text;
          const topicMatch = firstMsg.match(/\[ТИКЕТ: (.*?)\]/);
          const topicEl = $('chatTicketTopic');
          if (topicEl && topicMatch) topicEl.textContent = 'Тема: ' + topicMatch[1];
        }
      }

      // 3. Индикатор набора текста
      if (d.typing) {
        const isTyping = isAdmin ? d.typing.client : d.typing.admin;
        const typingEl = box.querySelector('.chat-typing');
        if (isTyping) {
          if (!typingEl) {
            const el = document.createElement('div');
            el.className = 'chat-msg admin chat-typing';
            el.innerHTML = `<div><div class="chat-bubble"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div><div class="chat-msg-meta">${isAdmin ? 'Client' : 'Elena'} is typing...</div></div>`;
            box.appendChild(el);
            box.scrollTop = box.scrollHeight;
          }
        } else if (typingEl) {
          typingEl.remove();
        }
      }
    })
    .catch(e => {
      console.error('Poll error:', e);
      isPolling = false;
    });
  }

  // Пометить прочитанным
  function markAsRead() {
    if (!token() || !email()) return;
    const from = window.adminViewingEmail ? 'client' : 'admin';
    fetch(WORKER + '?action=markChatRead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token(), email: email(), from: from })
    }).catch(() => {});
  }

  // Индикатор "Печатает..."
  let typingTimer = null;
  function sendTyping() {
    if (!token() || !email()) return;
    const from = window.adminViewingEmail ? 'admin' : 'client';
    fetch(WORKER + '?action=setTyping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token(), email: email(), who: from, typing: true })
    }).catch(() => {});

    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      fetch(WORKER + '?action=setTyping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token(), email: email(), who: from, typing: false })
      }).catch(() => {});
    }, 2500);
  }

  // ==========================================
  // ИНИЦИАЛИЗАЦИЯ
  // ==========================================
  document.addEventListener('DOMContentLoaded', () => {
    // Обработчик ввода (для индикатора набора)
    const chatInput = $('chatInput');
    if (chatInput) {
      chatInput.addEventListener('input', sendTyping);
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendChatMsg();
        }
      });
    }

    // Начинаем поллинг, если чат открыт
    setInterval(() => {
      const panel = $('chatPanel');
      if (panel && panel.style.display === 'flex') {
        pollChat();
      }
    }, 2000); // Каждые 2 секунды
  });

  console.log('%c[NordicCrypto] Chat v3.0 (KV) loaded', 'color:#00e5ff;font-weight:bold');
})();
