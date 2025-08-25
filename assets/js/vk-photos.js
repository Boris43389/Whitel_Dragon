---
---
(() => {
  const MAP_URL = "{{ '/assets/vk_photos/photos.json' | relative_url }}";
  const BASE    = "{{ '/assets/vk_photos/' | relative_url }}";

  let photoMap = null;

  const idFromHref = (href) => {
    const m = href && href.match(/photo(\d+_\d+)/);
    return m ? m[1] : null;
  };

  const makeFigure = (src, alt) => {
    const fig = document.createElement('figure');
    fig.className = 'post-photo';
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = alt || '';
    img.src = BASE + encodeURIComponent(src).replace(/%2F/gi, '/');
    fig.appendChild(img);
    return fig;
  };

  const replaceIn = (node) => {
    const root = node.querySelectorAll ? node : document;
    const anchors = root.querySelectorAll('a[href*="vk.com/photo"]');
    anchors.forEach(a => {
      const id = idFromHref(a.href);
      if (!id || !photoMap) return;

      const entry = photoMap[id] || photoMap['photo' + id];
      if (!entry) return;

      const names = Array.isArray(entry) ? entry : [entry];
      const frag = document.createDocumentFragment();
      names.forEach(name => frag.appendChild(makeFigure(name, a.textContent || id)));
      a.replaceWith(frag);
    });
  };

  const observeNewPosts = () => {
    const container = document.getElementById('posts-container') || document.body;
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) m.addedNodes.forEach(n => { if (n.nodeType === 1) replaceIn(n); });
    });
    obs.observe(container, { childList: true, subtree: true });
  };

  async function init() {
    try {
      const r = await fetch(MAP_URL, { cache: 'no-store' });
      if (!r.ok) { console.warn('vk-photos: map fetch failed', r.status); return; }
      photoMap = await r.json();
      window.VKPhotoMap = photoMap; // для проверки в консоли
    } catch (e) {
      console.warn('vk-photos: map load error', e);
      return;
    }
    replaceIn(document);
    observeNewPosts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
