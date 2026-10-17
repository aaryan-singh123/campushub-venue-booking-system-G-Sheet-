         
         
         
         
        const ASSETS = {
            modelLogo: 'assets/images/Model_Logo.png',
            samajamLogo: 'assets/images/Samajam_Logo.png',
            appLogo: 'assets/images/Campus_Logo.png',
            collegeShort: "KSD's Model College",
            collegeTag: 'Empowered Autonomous',
            appName: 'CampusHub',
            tagline: 'Venues Booking System',
            developer: 'Developed by Aaryankumar Singh | Model College'
        };
         
         
        const LOGO_CANDIDATES = { modelLogo: [ASSETS.modelLogo], samajamLogo: [ASSETS.samajamLogo], appLogo: [ASSETS.appLogo] };
        const LOGO_FOUND = {};  

        window.logoOk = (img) => { const k = img.dataset.key; if (k) LOGO_FOUND[k] = img.getAttribute('src'); };
        window.logoFail = (img) => {
            const key = img.dataset.key;
            const list = LOGO_CANDIDATES[key] || [];
            let i = parseInt(img.dataset.i || '0', 10) + 1;
            if (i < list.length) { img.dataset.i = String(i); img.src = list[i]; return; }
            if (img.dataset.keep) img.style.visibility = 'hidden'; else img.style.display = 'none';
        };
        function logoImg(key, cls = '', extra = '') {
            const list = LOGO_CANDIDATES[key] || [ASSETS[key]];
            const found = LOGO_FOUND[key];
            const start = found || list[0];
            const idx = found ? Math.max(0, list.indexOf(found)) : 0;
            return `<img src="${start}" data-key="${key}" data-i="${idx}" alt="" class="${cls}" ${extra} onload="logoOk(this)" onerror="logoFail(this)">`;
        }
        function esc(str) {
            return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }
