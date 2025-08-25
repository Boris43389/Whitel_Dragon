---
---
(() => {
  // Куда смотреть архив (Liquid подставит baseurl)
  const CANDIDATE_BASES = [
    "{{ '/assets/comments/' | relative_url }}",
    "{{ '/assets/wall/' | relative_url }}",
    "{{ '/wall/' | relative_url }}"
  ];
  const COMMENTS_FILE = 'comments0.html';

  const urlsFor = (pid) =>
    CANDIDATE_BASES.map(b => b.replace(/\/+$/,'') + '/' + pid + '/' + COMMENTS_FILE);

  async function fetchFirst(urls) {
    for (const u of urls) {
      try {
        const r = await fetch(u, { credentials: 'same-origin' });
        if (r.ok) return await r.text(); // HTML как строка
      } catch (_) {}
    }
    return null;
  }

  // Кнопка-переключатель
  function createToggle(pid, label) {
    const btn = document.createElement('button');
    btn.className = 'vkcom-toggle';
    btn.type = 'button';
    btn.textContent = label ?? 'Комментарии';
    btn.setAttribute('data-pid', pid);
    btn.setAttribute('aria-expanded', 'false');
    return btn;
  }

  function mountForArticle(article) {
    const pid = article.getAttribute('data-pid');
    if (!pid || article.__vkcomMounted) return;
    article.__vkcomMounted = true;

    // Панель с кнопкой
    let bar = article.querySelector('.vkcom-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'vkcom-bar';
      article.appendChild(bar);
    }
    const btn = createToggle(pid);
    bar.appendChild(btn);

    // Контейнер контента комментариев
    let box = article.querySelector('.vkcom-box');
    if (!box) {
      box = document.createElement('div');
      box.className = 'vkcom-box';
      box.hidden = true;
      article.appendChild(box);
    }

    btn.addEventListener('click', async () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        btn.setAttribute('aria-expanded', 'false');
        box.hidden = true;
        return;
      }
      if (!box.__loaded) {
        btn.disabled = true; btn.classList.add('loading');
        const html = await fetchFirst(urlsFor(pid));
        btn.disabled = false; btn.classList.remove('loading');

        if (!html) {
          btn.textContent = 'Комментарии (нет архива)';
          btn.setAttribute('aria-expanded', 'false');
          return;
        }

        // Разбираем HTML архива
        const parser = new DOMParser(); // парсим строку в Document (MDN) 
        const doc = parser.parseFromString(html, 'text/html'); /* MDN */
        // вычищаем лишнее
        doc.querySelectorAll('script, style, link, meta').forEach(n => n.remove());

        // Пытаемся найти контейнер комментов в разных дампах
        const candidates = [
          '.wrap_page_content',   // как в типовом дампе
          '.post__comments',      // альтернативные выгрузки
          '.replies',             // иногда так
          'body'                  // запасной вариант
        ];
        let wrap = null;
        for (const sel of candidates) { wrap = doc.querySelector(sel); if (wrap) break; }
        if (!wrap) wrap = doc.body;

        // Элементы комментариев — часто .item, но подстрахуемся
        let items = wrap.querySelectorAll('.item');
        if (!items.length) items = wrap.querySelectorAll('.reply, .comment, li, div');

        const count = items.length || wrap.children.length;

        const root = document.createElement('div');
        root.className = 'vkcom-list';
        (items.length ? items : wrap.children).forEach(el => root.appendChild(el.cloneNode(true)));

        box.appendChild(root);
        box.__loaded = true;
        btn.textContent = `Комментарии (${count})`;
      }
      btn.setAttribute('aria-expanded', 'true');
      box.hidden = false;
    });
  }

  function bootScope(root) {
    root.querySelectorAll('article.post[data-pid]').forEach(mountForArticle);
  }

  function init() {
    bootScope(document);
    // Поддержка бесконечной прокрутки — ловим новые посты
    const container = document.getElementById('posts-container') || document.body;
    const obs = new MutationObserver(muts => {           // наблюдатель за DOM (MDN)
      muts.forEach(m => m.addedNodes.forEach(n => {
        if (n.nodeType === 1) {
          if (n.matches?.('article.post[data-pid]')) mountForArticle(n);
          else bootScope(n);
        }
      }));
    });
    obs.observe(container, { childList: true, subtree: true }); /* MDN */
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
