 
(function () {
    const s = document.getElementById('splash');
    if (!s) return;
    let seen = false;
    try { seen = sessionStorage.getItem('ch_splash') === '1'; } catch (e) {   }
    if (seen) { s.remove(); return; }
    const name = s.querySelector('.sp-name');
    if (name) {
        const t = name.getAttribute('aria-label') || '';
        name.innerHTML = t.split('').map((ch, i) => `<span style="--i:${i}"${i >= 6 ? ' class="hub"' : ''} aria-hidden="true">${ch}</span>`).join('');
    }
    let done = false;
    function close() {
        if (done) return; done = true;
        try { sessionStorage.setItem('ch_splash', '1'); } catch (e) {   }
        s.classList.add('sp-out');
        setTimeout(() => s.remove(), 800);
    }
    
    setTimeout(close, 4000);
})();
