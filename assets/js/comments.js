---
---
(() => {
  // Где искать архив: можно оставить любые из этих трёх путей
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
        if (r.ok) return await r.text();               // читаем текст архива
      } catch (_) {}
    }
    return null;
  }

  function createToggle(pid) {
    const btn = document.createElement('button');
    btn.className = 'vkcom-toggle';
    btn.type = 'button';
    btn.textContent = 'Комментарии';
    btn.setAttribute('data-pid', pid);
    btn.setAttribute('aria-expanded', 'false');
    return btn;
  }

  function mountForArticle(article) {
    const pid = article.getAttribute('data-pid');
    if (!pid || article.__vkcomMounted) return;
    article.__vkcomMounted = true;

    let bar = article.querySelector('.vkcom-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'vkcom-bar';
      article.appendChild(bar);
    }
    const btn = createToggle(pid);
    bar.appendChild(btn);

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

        const parser = new DOMParser(); // парсим HTML-строку в документ
        const doc = parser.parseFromString(html, 'text/html');              /* MDN */ 
        doc.querySelectorAll('script, style, link, meta').forEach(n => n.remove()); // на всякий случай

        const wrap = doc.querySelector('.wrap_page_content') || doc.body;
        const items = wrap.querySelectorAll('.item'); // в дампе VK каждый коммент — .item
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
    // поддерживаем бесконечную прокрутку: отслеживаем появление новых постов
    const container = document.getElementById('posts-container') || document.body;
    const obs = new MutationObserver(muts => {                               /* MDN */
      muts.forEach(m => m.addedNodes.forEach(n => {
        if (n.nodeType === 1) {
          if (n.matches?.('article.post[data-pid]')) mountForArticle(n);
          else bootScope(n);
        }
      }));
    });
    obs.observe(container, { childList: true, subtree: true });              /* MDN */
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
