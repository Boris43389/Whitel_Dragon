(function () {
  async function boot() {
    const mapUrl = "{{ '/assets/vk_photos/photos.json' | relative_url }}";
    const base = "{{ '/assets/vk_photos/' | relative_url }}";

    let map = {};
    try {
      const r = await fetch(mapUrl, { cache: 'no-store' });
      if (!r.ok) return;
      map = await r.json();
    } catch (e) {
      console.warn('vk-photos: no map', e);
      return;
    }

    // Ищем все ссылки на vk.com/photo... внутри постов
    const anchors = document.querySelectorAll('#posts-container a[href*="vk.com/photo"]');
    anchors.forEach(a => {
      const m = a.href.match(/photo(\d+_\d+)/);
      if (!m) return;
      const id = m[1];                // 41076938_...
      const fname = map[id] || map['photo' + id]; // на всякий
      if (!fname) return;             // в карте нет — оставляем как есть

      const fig = document.createElement('figure');
      fig.className = 'post-photo';
      const img = document.createElement('img');
      img.src = base + fname;
      img.alt = a.textContent || id;
      img.loading = 'lazy';           // экономим трафик
      fig.appendChild(img);

      // Если хочется, сохраняем исходную ссылку подписью:
      // const cap = document.createElement('figcaption');
      // cap.textContent = a.textContent || a.href;
      // fig.appendChild(cap);

      a.replaceWith(fig);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

