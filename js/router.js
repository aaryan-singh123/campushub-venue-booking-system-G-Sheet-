         
         
         

        function renderApp() {
            const app = document.getElementById('app');
            app.innerHTML = '';

            const authViews = ['login', 'signup', 'signup_success', 'admin_login', 'admin_signup', 'admin_signup_success'];
            if (authViews.includes(state.view)) {
                app.innerHTML = renderAuthView();
                fitAuthPage();
            } else {
                 
                app.innerHTML = `
                    <div id="sidebar-wrap" class="sidebar-wrap">${renderSidebar()}</div>
                    <div class="flex-1 flex flex-col h-screen overflow-hidden w-full">
                        ${renderTopbar()}
                        <main class="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 p-4 md:p-6 hide-scrollbar relative">
                            <div class="max-w-7xl mx-auto pb-12 animate-fade-in" id="main-content">
                                ${getViewContent()}
                            </div>
                        </main>
                    </div>
                `;
            }

            if (state.view === 'admin_all_bookings') applyAdminFilters();
            if (state.view === 'admin_dash') applyDashFilters();
        }

         
         
        function fitAuthPage() {
            const body = document.querySelector('.ch-auth-body');
            const inner = document.querySelector('.ch-auth-inner');
            if (!body || !inner) return;
            inner.style.zoom = 1;
            body.style.overflowY = 'hidden';
            const cs = getComputedStyle(body);
            const avail = body.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
            const need = inner.getBoundingClientRect().height;
            let z = 1;
            if (need > avail) z = Math.max(0.6, avail / need);
            inner.style.zoom = z;
            if (need * z > avail + 2) body.style.overflowY = 'auto';  
        }
        window.addEventListener('resize', fitAuthPage);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAuthPage);

        function renderAuthBackground() { return ''; }

        function authShell(inner) {
            return `
                <div class="ch-auth">
                    <header class="ch-auth-head">
                        <div class="ch-auth-head-in">
                            <div class="ch-logo-badge">${logoImg('modelLogo', 'ch-auth-logo')}</div>
                            <div class="ch-college-wrap">
                                <p class="ch-college-kicker">Welcome to</p>
                                <h1 class="ch-college">${ASSETS.collegeShort}</h1>
                                <div class="ch-college-auto">${ASSETS.collegeTag}</div>
                                
                            </div>
                            <div class="ch-logo-badge">${logoImg('samajamLogo', 'ch-auth-logo')}</div>
                        </div>
                    </header>
                    <div class="ch-auth-body">
                        <div class="ch-auth-inner">
                            ${inner}
                            <p class="ch-dev">${ASSETS.developer}</p>
                        </div>
                    </div>
                </div>`;
        }

        function authBrand(isAdmin = false) {
            return `
                <div class="ch-brand ${isAdmin ? 'admin' : ''}">
                    ${logoImg('appLogo', 'ch-brand-logo')}
                    <div class="ch-brand-text">
                        <h2 class="ch-brand-name">${ASSETS.appName}</h2>
                        <p class="ch-brand-tag">${ASSETS.tagline}</p>
                        ${isAdmin ? '<span class="ch-badge"><i class="fa-solid fa-user-shield" style="margin-right:5px"></i>Administrator Portal</span>' : ''}
                    </div>
                </div>`;
        }

        function renderAuthView() { return authShell(renderAuthViewRaw()); }

        function renderAuthViewRaw() {
             
            if (state.view === 'signup_success') {
                return `
                    <div class="ch-wrap">
                        ${renderAuthBackground()}
                        <div class="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in text-center p-10">
                            <div class="text-emerald-500 text-6xl mb-4"><i class="fa-solid fa-circle-check"></i></div>
                            <h2 class="text-xl font-bold text-slate-900 mb-2">Account Created Successfully!</h2>
                            <p class="text-slate-500">Your committee account has been created.</p>
                            <p class="text-slate-500 mb-6">Within 24 hours, the Admin will review and approve your account.</p>
                            <p class="text-slate-800 font-bold mb-6">Thank You!</p>
                            <button onclick="navigate('login')" class="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-semibold hover:from-indigo-500 hover:to-violet-500 hover:-translate-y-0.5 transition-all duration-300 shadow-lg shadow-indigo-200">Login</button>
                        </div>
                    </div>
                `;
            }
            if (state.view === 'admin_signup_success') {
                return `
                    <div class="ch-wrap">
                        ${renderAuthBackground()}
                        <div class="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in text-center p-10">
                            <div class="text-emerald-500 text-6xl mb-4"><i class="fa-solid fa-circle-check"></i></div>
                            <h2 class="text-xl font-bold text-slate-900 mb-2">Admin Request Submitted!</h2>
                            <p class="text-slate-500 mb-6">An existing Admin has been notified and will Accept or Reject your request shortly.</p>
                            <p class="text-slate-800 font-bold mb-6">Thank You!</p>
                            <button onclick="navigate('admin_login')" class="w-full py-2.5 bg-gradient-to-r from-slate-800 to-slate-950 text-white rounded-lg font-semibold hover:from-slate-700 hover:to-slate-900 hover:-translate-y-0.5 transition shadow-lg">Admin Login</button>
                        </div>
                    </div>
                `;
            }

             
            if (state.view === 'admin_login' || state.view === 'admin_signup') {
                const isLogin = state.view === 'admin_login';
                return `
                    <div class="ch-wrap">
                        ${renderAuthBackground()}
                        <div class="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                            ${authBrand(true)}
                            <div class="p-8">
                                <div class="flex mb-6 border-b border-slate-200">
                                    <button onclick="navigate('admin_login')" class="flex-1 pb-3 text-center font-semibold text-sm transition-colors ${isLogin ? 'text-slate-800 border-b-2 border-slate-800' : 'text-slate-400 hover:text-slate-600'}">Admin Sign In</button>
                                    <button onclick="navigate('admin_signup')" class="flex-1 pb-3 text-center font-semibold text-sm transition-colors ${!isLogin ? 'text-slate-800 border-b-2 border-slate-800' : 'text-slate-400 hover:text-slate-600'}">Register Admin</button>
                                </div>

                                ${isLogin ? `
                                    <form onsubmit="doAdminLogin(event)" class="space-y-5">
                                        <div>
                                            <label class="block text-sm font-medium text-slate-700 mb-1">Username</label>
                                            <input type="text" id="adm-log-id" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-700 focus:border-slate-700 transition outline-none">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-slate-700 mb-1">Password</label>
                                            <input type="password" id="adm-log-pass" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-700 focus:border-slate-700 transition outline-none">
                                        </div>
                                        <button type="submit" class="w-full py-2.5 bg-gradient-to-r from-slate-800 to-slate-950 text-white rounded-lg font-semibold hover:from-slate-700 hover:to-slate-900 hover:-translate-y-0.5 transition shadow-lg">Admin Login</button>
                                    </form>
                                ` : `
                                    <form onsubmit="doAdminSignup(event)" class="space-y-4">
                                        <div>
                                            <label class="block text-xs font-medium text-slate-700 mb-1">Admin Name</label>
                                            <input type="text" id="adm-reg-name" required class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-700 outline-none text-sm">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                                            <input type="tel" id="adm-reg-phone" required pattern="[0-9]{10}" placeholder="10-digit number" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-700 outline-none text-sm">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-medium text-slate-700 mb-1">Username</label>
                                            <input type="text" id="adm-reg-username" required class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-700 outline-none text-sm">
                                        </div>
                                        <div class="grid grid-cols-2 gap-3">
                                            <div>
                                                <label class="block text-xs font-medium text-slate-700 mb-1">Password</label>
                                                <input type="password" id="adm-reg-pass" required class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-700 outline-none text-sm">
                                            </div>
                                            <div>
                                                <label class="block text-xs font-medium text-slate-700 mb-1">Confirm Password</label>
                                                <input type="password" id="adm-reg-confirm" required class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-700 outline-none text-sm">
                                            </div>
                                        </div>
                                        <p class="text-xs text-slate-400">Your request will be sent to an existing Admin for verification before you can log in.</p>
                                        <button type="submit" class="w-full py-2.5 mt-2 bg-gradient-to-r from-slate-800 to-slate-950 text-white rounded-lg font-semibold hover:from-slate-700 hover:to-slate-900 hover:-translate-y-0.5 transition shadow-lg">Submit Request</button>
                                    </form>
                                `}
                                <button onclick="navigate('login')" class="w-full text-center mt-6 text-xs font-semibold text-indigo-600 hover:underline"><i class="fa-solid fa-arrow-left mr-1"></i> Back to Committee Login</button>
                            </div>
                        </div>
                    </div>
                `;
            }

             
            const isLogin = state.view === 'login';
            return `
                <div class="ch-wrap">
                        ${renderAuthBackground()}
                    <div class="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                        ${authBrand(false)}
                        
                        <div class="p-8">
                            <div class="flex mb-6 border-b border-slate-200">
                                <button onclick="navigate('login')" class="flex-1 pb-3 text-center font-semibold text-sm transition-colors ${isLogin ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}">Sign In</button>
                                <button onclick="navigate('signup')" class="flex-1 pb-3 text-center font-semibold text-sm transition-colors ${!isLogin ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}">Create Account</button>
                            </div>

                            ${isLogin ? `
                                <form onsubmit="doLogin(event)" class="space-y-5">
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-1">Committee Name</label>
                                        <input type="text" id="log-id" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-1">Password</label>
                                        <input type="password" id="log-pass" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none">
                                    </div>
                                    <div class="text-right -mt-2"><button type="button" onclick="openForgot()" class="text-xs font-semibold text-indigo-600 hover:underline">Forgot password?</button></div>
                                    <button type="submit" class="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-semibold hover:from-indigo-500 hover:to-violet-500 hover:-translate-y-0.5 transition-all duration-300 shadow-lg shadow-indigo-200">Login</button>
                                </form>
                            ` : `
                                <form onsubmit="doSignup(event)" class="space-y-4">
                                    <div>
                                        <label class="block text-xs font-medium text-slate-700 mb-1">Committee Name</label>
                                        <input type="text" id="reg-comm" required class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                                    </div>
                                    <div class="grid grid-cols-2 gap-3">
                                        <div>
                                            <label class="block text-xs font-medium text-slate-700 mb-1">Category</label>
                                            <select id="reg-type" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white">
                                                ${COMMITTEE_TYPES.map(t => `<option>${escHtml(t)}</option>`).join('')}
                                            </select>
                                        </div>
                                        <div>
                                            <label class="block text-xs font-medium text-slate-700 mb-1">Incharge Name</label>
                                            <input type="text" id="reg-incharge" required class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                                        </div>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-medium text-slate-700 mb-1">Incharge Phone</label>
                                        <input type="tel" id="reg-phone" required pattern="[0-9]{10}" placeholder="10-digit number" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                                    </div>
                                    <div class="grid grid-cols-2 gap-3">
                                        <div>
                                            <label class="block text-xs font-medium text-slate-700 mb-1">Password</label>
                                            <input type="password" id="reg-pass" required class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-medium text-slate-700 mb-1">Confirm Password</label>
                                            <input type="password" id="reg-confirm" required class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                                        </div>
                                    </div>
                                    <button type="submit" class="w-full py-2.5 mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-semibold hover:from-indigo-500 hover:to-violet-500 hover:-translate-y-0.5 transition-all duration-300 shadow-lg shadow-indigo-200">Submit Request</button>
                                </form>
                            `}
                            <button onclick="navigate('admin_login')" class="w-full text-center mt-6 text-xs font-semibold text-slate-400 hover:text-slate-600"><i class="fa-solid fa-user-shield mr-1"></i> Administrator Login</button>
                        </div>
                    </div>
                </div>
            `;
        }

        function renderSidebar() {
            const isAdmin = state.currentUser.role === 'admin';
            
            let links = '';
            if (isAdmin) {
                const pendingUsers = state.users.filter(u => u.status === 'pending').length;
                const pendingBooks = state.bookings.filter(b => b.status === 'Pending').length;
                const unreadAdminNotifs = unreadNotifCount();
                
                links = `
                    ${sidebarLink('admin_dash', 'fa-chart-pie', 'Overview')}
                    ${sidebarLink('admin_venues', 'fa-building', 'Venues')}
                    ${sidebarLink('admin_approvals', 'fa-user-check', 'Pending Approvals', pendingUsers)}
                    ${sidebarLink('admin_requests', 'fa-calendar-check', 'Booking Requests', pendingBooks)}
                    ${sidebarLink('admin_all_bookings', 'fa-list', 'All Bookings')}
                    ${sidebarLink('admin_committees', 'fa-users', 'Committees')}
                    ${sidebarLink('calendar', 'fa-calendar-days', 'Master Calendar')}
                    ${sidebarLink('chat', 'fa-comments', 'Messages', unreadChatCount())}
                    ${sidebarLink('notifications', 'fa-bell', 'Notifications', unreadAdminNotifs)}
                    ${sidebarLink('settings', 'fa-gear', 'Settings')}
                `;
            } else {
                const unreadNotifs = unreadNotifCount();
                links = `
                    ${sidebarLink('user_dash', 'fa-house', 'Dashboard')}
                    ${sidebarLink('book_venue', 'fa-plus-circle', 'Book Venue')}
                    ${sidebarLink('my_bookings', 'fa-clock-rotate-left', 'My History')}
                    ${sidebarLink('calendar', 'fa-calendar-days', 'Calendar View')}
                    ${sidebarLink('chat', 'fa-headset', 'Chat with Admin', unreadChatCount())}
                    ${sidebarLink('notifications', 'fa-bell', 'Notifications', unreadNotifs)}
                    ${sidebarLink('profile', 'fa-user-gear', 'My Profile')}
                `;
            }

            return `
                ${state.sidebarOpen ? `<div onclick="toggleSidebar()" class="fixed inset-0 bg-slate-900/50 z-30 md:hidden"></div>` : ''}
                <aside class="w-64 bg-gradient-to-b from-slate-900 to-slate-950 text-slate-300 flex flex-col shrink-0 fixed md:static inset-y-0 left-0 z-40 h-full transition-transform duration-300 shadow-2xl transform ${state.sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0">
                    <div class="h-16 flex items-center px-6 bg-slate-950 border-b border-slate-800 shrink-0">
                        ${logoImg('appLogo', 'ch-side-logo')}
                        <span class="font-bold text-lg text-white tracking-wide">${ASSETS.appName}</span>
                        <button onclick="toggleSidebar()" class="ml-auto md:hidden text-slate-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
                    </div>
                    <div class="flex-1 overflow-y-auto py-4 hide-scrollbar space-y-1">
                        ${links}
                    </div>
                    <div class="p-4 bg-slate-950 border-t border-slate-800 shrink-0">
                        <button onclick="doLogout()" class="w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg text-slate-400 hover:text-white hover:bg-red-500/20 transition-colors">
                            <i class="fa-solid fa-arrow-right-from-bracket mr-3 w-5 text-center"></i> Logout
                        </button>
                        <p class="ch-dev-side">${ASSETS.developer.split(' | ').map(esc).join('<br>')}</p>
                    </div>
                </aside>
            `;
        }

        function sidebarLink(viewId, icon, label, badgeCount = 0) {
            const isActive = state.view === viewId;
            const activeClasses = isActive ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-900/40' : 'hover:bg-slate-800 hover:text-white';
            const badge = badgeCount > 0 ? `<span class="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">${badgeCount}</span>` : '';
            return `
                <a href="#" onclick="navigate('${viewId}'); return false;" class="flex items-center px-6 py-2.5 mx-3 rounded-lg text-sm font-medium transition-colors ${activeClasses}">
                    <i class="${icon} mr-3 w-5 text-center ${isActive ? 'text-white' : 'text-slate-400'}"></i>
                    ${label}
                    ${badge}
                </a>
            `;
        }

        function renderTopbar() {
            return `
                <header class="h-16 bg-white shadow-sm flex items-center justify-between px-4 md:px-6 shrink-0 z-10 border-b border-slate-200">
                    <div class="flex items-center gap-3 min-w-0">
                        <button onclick="toggleSidebar()" class="md:hidden w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 shrink-0"><i class="fa-solid fa-bars"></i></button>
                        <h2 class="text-lg md:text-xl font-bold text-slate-800 capitalize truncate" id="topbar-title">${state.view.replace(/_/g, ' ')}</h2>
                    </div>
                    <div class="flex items-center space-x-3 md:space-x-4 shrink-0">
                        <div class="text-right hidden sm:block">
                            <p class="text-sm font-bold text-slate-900 leading-tight">${state.currentUser.committee}</p>
                            <p class="text-xs text-slate-500 font-medium">${state.currentUser.role === 'admin' ? 'Administrator' : 'Committee Account'}</p>
                        </div>
                        <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border-2 border-indigo-200 shrink-0">
                            ${state.currentUser.committee.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </header>
            `;
        }

         
         
         

        function getViewContent() {
            switch(state.view) {
                 
                case 'admin_dash': return viewAdminDash();
                case 'admin_venues': return viewAdminVenues();
                case 'admin_approvals': return viewAdminApprovals();
                case 'admin_requests': return viewAdminRequests();
                case 'admin_all_bookings': return viewAdminAllBookings();
                case 'admin_committees': return viewAdminCommittees();
                case 'settings': return state.currentUser.role === 'admin' ? viewSettings() : viewUserDash();
                
                 
                case 'user_dash': return viewUserDash();
                case 'book_venue': return viewBookVenue();
                case 'my_bookings': return viewMyBookings();
                case 'profile': return viewProfile();
                case 'notifications': return viewNotifications();
                
                 
                case 'calendar': return viewCalendar();
                case 'chat': return viewChat();
                
                default: return `<div class="p-8 text-center text-slate-500">View not found</div>`;
            }
        }
