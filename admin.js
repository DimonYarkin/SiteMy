// ==================== DATA STORE ====================
const DB = {
    getUsers() { return JSON.parse(localStorage.getItem('crm_users') || '[]'); },
    setUsers(v) { localStorage.setItem('crm_users', JSON.stringify(v)); },
    getClients() { return JSON.parse(localStorage.getItem('crm_clients') || '[]'); },
    setClients(v) { localStorage.setItem('crm_clients', JSON.stringify(v)); },
    getTickets() { return JSON.parse(localStorage.getItem('crm_tickets') || '[]'); },
    setTickets(v) { localStorage.setItem('crm_tickets', JSON.stringify(v)); },
    getSession() { return JSON.parse(localStorage.getItem('crm_session') || 'null'); },
    setSession(v) { localStorage.setItem('crm_session', JSON.stringify(v)); },
    getConsentLog() { return JSON.parse(localStorage.getItem('crm_consent_log') || '[]'); },
    addConsentLog(entry) { const log = this.getConsentLog(); log.push(entry); localStorage.setItem('crm_consent_log', JSON.stringify(log)); },
};

// ==================== UTILS ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== PHONE FORMAT ====================
function formatPhone(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length === 0) {
        input.value = '';
        return;
    }
    // Auto-add 7 if user starts with 8 or 9
    if (value[0] === '8') value = '7' + value.slice(1);
    if (value[0] === '9') value = '7' + value;
    if (value[0] !== '7') value = '7' + value;
    
    let formatted = '+7';
    if (value.length > 1) formatted += ' (' + value.slice(1, 4);
    if (value.length > 4) formatted += ') ' + value.slice(4, 7);
    if (value.length > 7) formatted += '-' + value.slice(7, 9);
    if (value.length > 9) formatted += '-' + value.slice(9, 11);
    
    input.value = formatted;
}

function phoneKeyDown(e) {
    // Allow: backspace, delete, tab, escape, enter, arrows
    if ([8, 46, 9, 27, 13, 37, 38, 39, 40].indexOf(e.keyCode) !== -1 ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true)) {
        return;
    }
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault();
    }
}

// ==================== PASSWORD HASHING ====================
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ==================== AUTH ====================
let currentUser = null;

function switchAuthTab(tab) {
    document.getElementById('authLoginTab').className = tab === 'login' ? 'flex-1 py-2.5 text-sm font-medium rounded-lg bg-white text-brand-dark shadow-sm transition-all' : 'flex-1 py-2.5 text-sm font-medium rounded-lg text-gray-500 transition-all';
    document.getElementById('authRegisterTab').className = tab === 'register' ? 'flex-1 py-2.5 text-sm font-medium rounded-lg bg-white text-brand-dark shadow-sm transition-all' : 'flex-1 py-2.5 text-sm font-medium rounded-lg text-gray-500 transition-all';
    document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
    document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const passwordHash = await hashPassword(password);
    const users = DB.getUsers();
    const user = users.find(u => u.email === email && u.passwordHash === passwordHash);
    
    if (user) {
        currentUser = user;
        DB.setSession({ userId: user.id, loginAt: new Date().toISOString() });
        // Log consent on login
        DB.addConsentLog({
            userId: user.id,
            action: 'login',
            timestamp: new Date().toISOString(),
            ip: 'client-side',
        });
        showApp();
    } else {
        const err = document.getElementById('loginError');
        err.textContent = 'Неверный email или пароль';
        err.classList.remove('hidden');
        setTimeout(() => err.classList.add('hidden'), 3000);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    // Check consent checkboxes
    const consentCheckbox = document.getElementById('regConsent');
    const termsCheckbox = document.getElementById('regTerms');
    if (!consentCheckbox?.checked || !termsCheckbox?.checked) {
        const err = document.getElementById('registerError');
        err.textContent = 'Необходимо дать согласие на обработку персональных данных';
        err.classList.remove('hidden');
        setTimeout(() => err.classList.add('hidden'), 3000);
        return;
    }
    
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;
    const users = DB.getUsers();
    
    if (users.find(u => u.email === email)) {
        const err = document.getElementById('registerError');
        err.textContent = 'Пользователь с таким email уже существует';
        err.classList.remove('hidden');
        setTimeout(() => err.classList.add('hidden'), 3000);
        return;
    }
    
    // First user is always admin
    const isFirstUser = users.length === 0;
    const userRole = isFirstUser ? 'admin' : role;
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    const newUser = {
        id: 'u' + Date.now(),
        name,
        email,
        passwordHash,
        role: userRole,
        created: new Date().toISOString().split('T')[0],
        consentGiven: true,
        consentDate: new Date().toISOString(),
        consentVersion: '1.0',
    };
    users.push(newUser);
    DB.setUsers(users);
    
    // Log consent
    DB.addConsentLog({
        userId: newUser.id,
        action: 'registration',
        email: email,
        timestamp: new Date().toISOString(),
        consentVersion: '1.0',
    });
    
    currentUser = newUser;
    DB.setSession({ userId: newUser.id, loginAt: new Date().toISOString() });
    showApp();
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('crm_session');
    document.getElementById('app').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
}

function showApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userRole').textContent = currentUser.role === 'admin' ? 'Администратор' : 'Менеджер';
    document.getElementById('userAvatar').textContent = currentUser.name.split(' ').map(w => w[0]).join('').toUpperCase();
    renderAll();
}

function clearTestData() {
    if (!confirm('Удалить все тестовые заявки и чаты? Клиенты и пользователи сохранятся.')) return;
    localStorage.removeItem('crm_tickets');
    localStorage.removeItem('crm_chats');
    localStorage.removeItem('crm_consent_log');
    renderAll();
    showToast('Тестовые данные очищены');
}

// ==================== NAVIGATION ====================
function showSection(section) {
    document.querySelectorAll('[id^="section-"]').forEach(el => el.classList.add('hidden'));
    document.getElementById('section-' + section).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-white/10', 'text-white');
        btn.classList.add('text-white/60');
    });
    const activeBtn = document.querySelector(`.nav-btn[data-section="${section}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active', 'bg-white/10', 'text-white');
        activeBtn.classList.remove('text-white/60');
    }
    const titles = {
        dashboard: ['Дашборд', 'Обзор системы'],
        kanban: ['Kanban-доска', 'Управление заявками'],
        tickets: ['Заявки', 'Список всех заявок'],
        clients: ['Клиенты', 'Управление клиентами'],
        users: ['Пользователи', 'Управление доступом'],
        consent: ['Журнал согласий', 'Согласия на обработку ПД'],
        livechat: ['Онлайн-чат', 'Общение с клиентами'],
        settings: ['Настройки сайта', 'Контакты, аналитика, SEO'],
    };
    document.getElementById('pageTitle').textContent = titles[section][0];
    document.getElementById('pageSubtitle').textContent = titles[section][1];
    if (section === 'settings') loadSettings();
    renderAll();
}

// ==================== RENDER ====================
function renderAll() {
    renderDashboard();
    renderKanban();
    renderTickets();
    renderClients();
    renderUsers();
    renderConsentLog();
    renderChatList();
    updateClientSelect();
    updateAssigneeSelect();
    updateChatBadge();
}

// ==================== SETTINGS ====================
const SETTINGS_KEY = 'site_settings';

function getSettings() {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
}

function loadSettings() {
    const s = getSettings();
    document.getElementById('settingPhone').value = s.phone || '';
    document.getElementById('settingEmail').value = s.email || '';
    document.getElementById('settingAddress').value = s.address || '';
    document.getElementById('settingGA').value = s.gaId || '';
    document.getElementById('settingYM').value = s.ymId || '';
    document.getElementById('settingYandexVerify').value = s.yandexVerify || '';
    document.getElementById('settingGoogleVerify').value = s.googleVerify || '';
    document.getElementById('settingWhatsapp').value = s.whatsapp || '';
    document.getElementById('settingTelegram').value = s.telegram || '';
    document.getElementById('settingMax').value = s.max || '';
}

function saveSettings() {
    const settings = {
        phone: document.getElementById('settingPhone').value.trim(),
        email: document.getElementById('settingEmail').value.trim(),
        address: document.getElementById('settingAddress').value.trim(),
        gaId: document.getElementById('settingGA').value.trim(),
        ymId: document.getElementById('settingYM').value.trim(),
        yandexVerify: document.getElementById('settingYandexVerify').value.trim(),
        googleVerify: document.getElementById('settingGoogleVerify').value.trim(),
        whatsapp: document.getElementById('settingWhatsapp').value.trim(),
        telegram: document.getElementById('settingTelegram').value.trim(),
        max: document.getElementById('settingMax').value.trim(),
        updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    showToast('Настройки сохранены');
}

function applySettings() {
    saveSettings();
    showToast('Настройки применены. Обновите лендинг для отображения изменений.');
}

function renderDashboard() {
    const tickets = DB.getTickets();
    const total = tickets.length;
    const newCount = tickets.filter(t => t.status === 'new').length;
    const progressCount = tickets.filter(t => t.status === 'progress').length;
    const waitingCount = tickets.filter(t => t.status === 'waiting').length;
    const doneCount = tickets.filter(t => t.status === 'done').length;
    const websiteCount = tickets.filter(t => t.source === 'landing-form').length;
    
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statWebsite').textContent = websiteCount;
    document.getElementById('statNew').textContent = newCount;
    document.getElementById('statProgress').textContent = progressCount + waitingCount;
    document.getElementById('statDone').textContent = doneCount;
    
    document.getElementById('chartNew').textContent = newCount;
    document.getElementById('chartProgress').textContent = progressCount;
    document.getElementById('chartWaiting').textContent = waitingCount;
    document.getElementById('chartDone').textContent = doneCount;
    
    if (total > 0) {
        document.getElementById('chartNewBar').style.width = (newCount / total * 100) + '%';
        document.getElementById('chartProgressBar').style.width = (progressCount / total * 100) + '%';
        document.getElementById('chartWaitingBar').style.width = (waitingCount / total * 100) + '%';
        document.getElementById('chartDoneBar').style.width = (doneCount / total * 100) + '%';
    } else {
        document.getElementById('chartNewBar').style.width = '0%';
        document.getElementById('chartProgressBar').style.width = '0%';
        document.getElementById('chartWaitingBar').style.width = '0%';
        document.getElementById('chartDoneBar').style.width = '0%';
    }
    
    // Recent tickets
    const clients = DB.getClients();
    const recent = [...tickets].sort((a, b) => new Date(b.updated) - new Date(a.updated)).slice(0, 5);
    document.getElementById('recentTickets').innerHTML = recent.length > 0 
        ? recent.map(t => {
            const client = clients.find(c => c.id === t.client);
            const statusColors = { new: 'bg-yellow-100 text-yellow-700', progress: 'bg-blue-100 text-blue-700', waiting: 'bg-orange-100 text-orange-700', done: 'bg-green-100 text-green-700' };
            const statusNames = { new: 'Новая', progress: 'В работе', waiting: 'Ожидание', done: 'Выполнена' };
            const shortId = t.id.replace('t', '').slice(-4);
            const sourceBadge = t.source === 'landing-form' ? '<span class="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-600 ml-1">сайт</span>' : '';
            return `<div class="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 hover:bg-gray-50 cursor-pointer" onclick="showTicketDetail('${t.id}')">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    <div class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">#${shortId}</div>
                    <div class="min-w-0 flex-1">
                        <div class="font-medium text-brand-dark text-sm truncate">${t.subject}</div>
                        <div class="text-xs text-gray-500 truncate">${client ? client.company : 'Аноним'}${sourceBadge}</div>
                    </div>
                </div>
                <span class="px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[t.status]} flex-shrink-0">${statusNames[t.status]}</span>
            </div>`;
        }).join('')
        : '<div class="px-6 py-8 text-center text-gray-400 text-sm">Заявок пока нет</div>';
    
    // Service stats
    const serviceNames = { dev: 'Доработка', hosting: 'Размещение', marking: 'Маркировка', support: 'Обслуживание', outsourcing: 'IT-аутсорсинг', other: 'Другое' };
    const serviceCounts = {};
    tickets.forEach(t => { serviceCounts[t.service] = (serviceCounts[t.service] || 0) + 1; });
    document.getElementById('serviceStats').innerHTML = Object.keys(serviceCounts).length > 0
        ? Object.entries(serviceCounts).map(([k, v]) => `<div class="flex justify-between"><span class="text-gray-600">${serviceNames[k] || k}</span><span class="font-medium">${v}</span></div>`).join('')
        : '<div class="text-gray-400 text-sm">Нет данных</div>';
}

function renderKanban() {
    const tickets = DB.getTickets();
    const clients = DB.getClients();
    const users = DB.getUsers();
    const filter = document.getElementById('kanbanFilter').value;
    const filtered = filter === 'all' ? tickets : tickets.filter(t => t.service === filter);
    
    const columns = { new: [], progress: [], waiting: [], done: [] };
    filtered.forEach(t => { if (columns[t.status]) columns[t.status].push(t); });
    
    const priorityColors = { low: 'border-l-gray-300', medium: 'border-l-blue-400', high: 'border-l-orange-400', urgent: 'border-l-red-500' };
    const serviceNames = { dev: 'Доработка', hosting: 'Размещение', marking: 'Маркировка', support: 'Обслуживание', outsourcing: 'IT-аутсорсинг', other: 'Другое' };
    
    Object.entries(columns).forEach(([status, items]) => {
        const col = document.querySelector(`.kanban-column[data-status="${status}"]`);
        if (!col) return;
        col.innerHTML = items.map(t => {
            const client = clients.find(c => c.id === t.client);
            const assignee = users.find(u => u.id === t.assignee);
            const isAnon = !client || client.source === 'landing-form';
            const sourceBadge = t.source === 'landing-form' ? '<span class="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-600 ml-1">сайт</span>' : '';
            const shortId = t.id.replace('t', '').slice(-4);
            return `<div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm cursor-grab hover:shadow-md transition-all border-l-4 ${priorityColors[t.priority]}" draggable="true" ondragstart="handleDragStart(event)" data-id="${t.id}" onclick="showTicketDetail('${t.id}')">
                <div class="flex items-center justify-between mb-2 gap-2">
                    <span class="text-xs text-gray-400 flex-shrink-0">#${shortId}${sourceBadge}</span>
                    <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 truncate">${serviceNames[t.service] || t.service}</span>
                </div>
                <h4 class="font-semibold text-brand-dark text-sm mb-2 line-clamp-2">${t.subject}</h4>
                <p class="text-xs text-gray-500 mb-3 line-clamp-2">${t.description || ''}</p>
                <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                        <div class="w-6 h-6 rounded-full ${isAnon ? 'bg-gray-400' : 'bg-blue-500'} flex items-center justify-center text-white text-xs font-bold flex-shrink-0">${client ? client.company[0] : '?'}</div>
                        <span class="text-xs text-gray-500 truncate">${client ? client.company : 'Аноним'}</span>
                    </div>
                    ${assignee ? `<div class="w-6 h-6 rounded-full bg-brand-red flex items-center justify-center text-white text-xs flex-shrink-0" title="${assignee.name}">${assignee.name[0]}</div>` : ''}
                </div>
            </div>`;
        }).join('');
        
        const countEl = document.querySelector(`.kanban-count[data-status="${status}"]`);
        if (countEl) countEl.textContent = items.length;
    });
}

function renderTickets() {
    const tickets = DB.getTickets();
    const clients = DB.getClients();
    const users = DB.getUsers();
    const search = (document.getElementById('ticketSearch')?.value || '').toLowerCase();
    const filter = document.getElementById('ticketFilter')?.value || 'all';
    
    let filtered = tickets;
    if (filter !== 'all') filtered = filtered.filter(t => t.status === filter);
    if (search) filtered = filtered.filter(t => t.subject.toLowerCase().includes(search) || (clients.find(c => c.id === t.client)?.company || '').toLowerCase().includes(search));
    
    const statusColors = { new: 'bg-yellow-100 text-yellow-700', progress: 'bg-blue-100 text-blue-700', waiting: 'bg-orange-100 text-orange-700', done: 'bg-green-100 text-green-700' };
    const statusNames = { new: 'Новая', progress: 'В работе', waiting: 'Ожидание', done: 'Выполнена' };
    const serviceNames = { dev: 'Доработка', hosting: 'Размещение', marking: 'Маркировка', support: 'Обслуживание', outsourcing: 'IT-аутсорсинг', other: 'Другое' };
    
    document.getElementById('ticketsTable').innerHTML = filtered.length > 0
        ? filtered.map(t => {
            const client = clients.find(c => c.id === t.client);
            const assignee = users.find(u => u.id === t.assignee);
            const sourceBadge = t.source === 'landing-form' ? ' <span class="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-600">сайт</span>' : '';
            const shortId = t.id.replace('t', '').slice(-4);
            return `<tr class="hover:bg-gray-50 cursor-pointer" onclick="showTicketDetail('${t.id}')">
                <td class="px-4 py-3 text-sm font-medium text-gray-500 whitespace-nowrap" data-label="ID">#${shortId}${sourceBadge}</td>
                <td class="px-4 py-3" data-label="Тема"><div class="font-medium text-brand-dark text-sm truncate max-w-[200px]">${t.subject}</div></td>
                <td class="px-4 py-3 text-sm text-gray-600 truncate max-w-[120px]" data-label="Клиент">${client ? client.company : 'Аноним'}</td>
                <td class="px-4 py-3 text-sm text-gray-600 hidden md:table-cell" data-label="Услуга">${serviceNames[t.service] || t.service}</td>
                <td class="px-4 py-3" data-label="Статус"><span class="px-2 py-1 text-xs font-medium rounded-full ${statusColors[t.status]}">${statusNames[t.status]}</span></td>
                <td class="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell" data-label="Ответственный">${assignee ? assignee.name : '—'}</td>
                <td class="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell" data-label="Дата">${t.created}</td>
                <td class="px-4 py-3 text-right" data-label="">
                    <button onclick="event.stopPropagation(); deleteTicket('${t.id}')" class="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Удалить">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </td>
            </tr>`;
        }).join('')
        : '<tr><td colspan="8" class="px-6 py-12 text-center text-gray-400 text-sm">Заявок пока нет</td></tr>';
}

function renderClients() {
    const clients = DB.getClients();
    const tickets = DB.getTickets();
    const search = (document.getElementById('clientSearch')?.value || '').toLowerCase();
    
    let filtered = clients;
    if (search) filtered = filtered.filter(c => c.company.toLowerCase().includes(search) || c.contact.toLowerCase().includes(search));
    
    const planNames = { none: 'Не подключен', start: 'Старт', business: 'Бизнес', corporation: 'Корпорация' };
    const planColors = { none: 'bg-gray-100 text-gray-500', start: 'bg-blue-100 text-blue-700', business: 'bg-brand-orange/20 text-brand-orange', corporation: 'bg-brand-red/10 text-brand-red' };
    const sourceNames = { 'landing-form': 'Сайт', 'cabinet': 'Кабинет', 'admin': 'CRM' };
    const sourceColors = { 'landing-form': 'bg-green-100 text-green-700', 'cabinet': 'bg-blue-100 text-blue-700', 'admin': 'bg-gray-100 text-gray-700' };
    
    document.getElementById('clientsTable').innerHTML = filtered.length > 0
        ? filtered.map(c => {
            const ticketCount = tickets.filter(t => t.client === c.id).length;
            const sourceBadge = c.source ? `<span class="px-2 py-0.5 text-xs font-medium rounded-full ${sourceColors[c.source] || sourceColors.admin}">${sourceNames[c.source] || c.source}</span>` : '';
            return `<tr class="hover:bg-gray-50">
                <td class="px-6 py-4 font-medium text-brand-dark">${c.company} ${sourceBadge}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${c.contact}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${c.phone || '—'}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${c.email || '—'}</td>
                <td class="px-6 py-4 text-sm font-medium">${ticketCount}</td>
                <td class="px-6 py-4"><span class="px-3 py-1 text-xs font-medium rounded-full ${planColors[c.plan] || planColors.none}">${planNames[c.plan] || '—'}</span></td>
                <td class="px-6 py-4 text-right">
                    <button onclick="resetClientPassword('${c.id}')" class="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors mr-1" title="Сбросить пароль">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                    </button>
                    <button onclick="deleteClient('${c.id}')" class="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Удалить">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </td>
            </tr>`;
        }).join('')
        : '<tr><td colspan="7" class="px-6 py-12 text-center text-gray-400">Клиентов пока нет</td></tr>';
}

function renderUsers() {
    const users = DB.getUsers();
    const roleNames = { admin: 'Администратор', manager: 'Менеджер' };
    const roleColors = { admin: 'bg-brand-red/10 text-brand-red', manager: 'bg-blue-100 text-blue-700' };
    
    document.getElementById('usersTable').innerHTML = users.length > 0
        ? users.map(u => `<tr class="hover:bg-gray-50">
            <td class="px-6 py-4 font-medium text-brand-dark">${u.name}</td>
            <td class="px-6 py-4 text-sm text-gray-600">${u.email}</td>
            <td class="px-6 py-4"><span class="px-3 py-1 text-xs font-medium rounded-full ${roleColors[u.role]}">${roleNames[u.role]}</span></td>
            <td class="px-6 py-4 text-sm text-gray-500">${u.created}</td>
            <td class="px-6 py-4 text-right">
                ${u.id !== currentUser.id ? `
                    <button onclick="resetUserPassword('${u.id}')" class="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors mr-1" title="Сбросить пароль">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                    </button>
                    <button onclick="deleteUser('${u.id}')" class="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Удалить">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                ` : '<span class="text-xs text-gray-400">Вы</span>'}
            </td>
        </tr>`).join('')
        : '<tr><td colspan="5" class="px-6 py-12 text-center text-gray-400">Пользователей пока нет</td></tr>';
}

function renderConsentLog() {
    const log = DB.getConsentLog();
    const users = DB.getUsers();
    const clients = DB.getClients();
    
    const actionNames = { registration: 'Регистрация', login: 'Вход в систему' };
    const actionColors = { registration: 'bg-green-100 text-green-700', login: 'bg-blue-100 text-blue-700' };
    
    const sorted = [...log].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    document.getElementById('consentTable').innerHTML = sorted.length > 0
        ? sorted.map(entry => {
            const user = users.find(u => u.id === entry.userId);
            const client = clients.find(c => c.id === entry.clientId);
            const name = user ? user.name : (client ? client.contact : '—');
            const email = entry.email || user?.email || client?.email || '—';
            return `<tr class="hover:bg-gray-50">
                <td class="px-6 py-4 text-sm text-gray-600">${new Date(entry.timestamp).toLocaleString('ru-RU')}</td>
                <td class="px-6 py-4"><span class="px-3 py-1 text-xs font-medium rounded-full ${actionColors[entry.action] || 'bg-gray-100 text-gray-700'}">${actionNames[entry.action] || entry.action}</span></td>
                <td class="px-6 py-4 text-sm font-medium text-gray-700">${name}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${email}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${entry.consentVersion || '—'}</td>
            </tr>`;
        }).join('')
        : '<tr><td colspan="5" class="px-6 py-12 text-center text-gray-400">Записей пока нет</td></tr>';
}

function exportConsentLog() {
    const log = DB.getConsentLog();
    const users = DB.getUsers();
    const clients = DB.getClients();
    
    const actionNames = { registration: 'Регистрация', login: 'Вход в систему' };
    
    const rows = [['Дата/Время', 'Действие', 'Пользователь', 'Email', 'Версия']];
    log.forEach(entry => {
        const user = users.find(u => u.id === entry.userId);
        const client = clients.find(c => c.id === entry.clientId);
        const name = user ? user.name : (client ? client.contact : '—');
        const email = entry.email || user?.email || client?.email || '—';
        rows.push([
            new Date(entry.timestamp).toLocaleString('ru-RU'),
            actionNames[entry.action] || entry.action,
            name,
            email,
            entry.consentVersion || '—',
        ]);
    });
    
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consent_log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Журнал экспортирован');
}

// ==================== LIVE CHAT ====================
let activeChatSessionId = null;

function getChats() {
    return JSON.parse(localStorage.getItem('crm_chats') || '[]');
}

function setChats(chats) {
    localStorage.setItem('crm_chats', JSON.stringify(chats));
}

function updateChatBadge() {
    const chats = getChats();
    const openChats = chats.filter(c => c.status === 'open' && c.hasNewMessages);
    const badge = document.getElementById('chatBadgeNav');
    if (badge) {
        if (openChats.length > 0) {
            badge.classList.remove('hidden');
            badge.textContent = openChats.length;
        } else {
            badge.classList.add('hidden');
        }
    }
}

function renderChatList() {
    const chats = getChats();
    const chatList = document.getElementById('chatList');
    if (!chatList) return;
    
    const openChats = chats.filter(c => c.status === 'open').sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
    const closedChats = chats.filter(c => c.status !== 'open').sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity)).slice(0, 10);
    
    chatList.innerHTML = '';
    
    if (openChats.length === 0 && closedChats.length === 0) {
        chatList.innerHTML = '<div class="p-6 text-center text-gray-400 text-sm">Нет активных чатов</div>';
        return;
    }
    
    if (openChats.length > 0) {
        const header = document.createElement('div');
        header.className = 'px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase';
        header.textContent = 'Активные';
        chatList.appendChild(header);
        
        openChats.forEach(chat => {
            chatList.appendChild(createChatListItem(chat, false));
        });
    }
    
    if (closedChats.length > 0) {
        const header = document.createElement('div');
        header.className = 'px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase';
        header.textContent = 'Завершенные';
        chatList.appendChild(header);
        
        closedChats.forEach(chat => {
            chatList.appendChild(createChatListItem(chat, true));
        });
    }
}

function createChatListItem(chat, isClosed) {
    const item = document.createElement('div');
    const isActive = activeChatSessionId === chat.sessionId;
    const unread = chat.hasNewMessages && !isClosed;
    const reopened = chat.reopenedBy === 'client' && chat.status === 'open';
    
    item.className = `px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-all ${isActive ? 'bg-red-50 border-l-2 border-l-brand-red' : ''} ${unread ? 'bg-yellow-50/50' : ''} ${reopened ? 'bg-blue-50/50' : ''}`;
    
    const lastMsg = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;
    const lastMsgText = lastMsg ? lastMsg.text.substring(0, 50) + (lastMsg.text.length > 50 ? '...' : '') : 'Нет сообщений';
    const lastMsgTime = lastMsg ? lastMsg.time : '';
    
    let statusBadge = '';
    if (reopened) {
        statusBadge = '<span class="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 animate-pulse">Возобновлен</span>';
    } else if (isClosed) {
        statusBadge = `<span class="text-xs px-1.5 py-0.5 rounded ${chat.closeStatus === 'resolved' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}">${chat.closeStatus === 'resolved' ? 'Решен' : 'Общение'}</span>`;
    } else if (unread) {
        statusBadge = '<span class="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse"></span>';
    }
    
    const newMsgIndicator = unread ? '<div class="w-1.5 h-1.5 bg-brand-red rounded-full absolute top-3 right-3"></div>' : '';
    
    item.innerHTML = `
        <div class="relative">
            ${newMsgIndicator}
            <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-medium text-brand-dark">${chat.sessionId.substring(0, 12)}...</span>
                <div class="flex items-center gap-2">
                    ${statusBadge}
                    <span class="text-xs text-gray-400">${lastMsgTime}</span>
                </div>
            </div>
            <p class="text-xs text-gray-500 truncate">${lastMsgText}</p>
        </div>
    `;
    
    item.onclick = () => openChat(chat.sessionId);
    return item;
}

function openChat(sessionId) {
    activeChatSessionId = sessionId;
    const chats = getChats();
    const chat = chats.find(c => c.sessionId === sessionId);
    if (!chat) return;
    
    // Mark as read
    chat.hasNewMessages = false;
    setChats(chats);
    
    // Update header
    const reopened = chat.reopenedBy === 'client' && chat.status === 'open';
    const statusText = reopened ? 'Возобновлен клиентом' : (chat.status === 'open' ? 'Активен' : 'Завершен');
    document.getElementById('chatWindowTitle').textContent = `Чат ${sessionId.substring(0, 16)}...`;
    document.getElementById('chatWindowSubtitle').textContent = `${chat.messages.length} сообщений · ${statusText}`;
    document.getElementById('chatWindowActions').classList.toggle('hidden', chat.status !== 'open');
    document.getElementById('chatWindowInput').classList.toggle('hidden', chat.status !== 'open');
    
    // Render messages
    const messagesDiv = document.getElementById('chatWindowMessages');
    const previousCount = messagesDiv.children.length;
    messagesDiv.innerHTML = '';
    
    // Show reopened notice if applicable
    if (reopened) {
        const notice = document.createElement('div');
        notice.className = 'mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-center';
        notice.innerHTML = '<span class="text-sm text-blue-700 font-medium">Клиент возобновил чат — есть новые вопросы</span>';
        messagesDiv.appendChild(notice);
    }
    
    chat.messages.forEach((msg, index) => {
        const isClient = msg.from === 'client';
        const isNew = index >= previousCount && index === chat.messages.length - 1;
        const msgDiv = document.createElement('div');
        msgDiv.className = `mb-3 ${isClient ? '' : 'text-right'} ${isNew ? 'chat-flash' : ''}`;
        msgDiv.innerHTML = `
            <div class="text-xs text-gray-400 mb-1">${isClient ? 'Клиент' : 'Менеджер'} · ${msg.time}</div>
            <div class="inline-block px-4 py-2.5 rounded-2xl text-sm ${isClient ? 'bg-white text-gray-700 rounded-bl-md' : 'bg-brand-red text-white rounded-br-md'}">${escapeHtml(msg.text)}</div>
        `;
        messagesDiv.appendChild(msgDiv);
    });
    
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // Update chat list
    renderChatList();
    updateChatBadge();
}

function sendManagerMessage() {
    const input = document.getElementById('managerChatInput');
    const text = input.value.trim();
    if (!text || !activeChatSessionId) return;
    
    const chats = getChats();
    const chat = chats.find(c => c.sessionId === activeChatSessionId);
    if (!chat || chat.status !== 'open') return;
    
    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    chat.messages.push({
        from: 'manager',
        text,
        time,
        timestamp: new Date().toISOString(),
        managerId: currentUser.id,
    });
    chat.lastActivity = new Date().toISOString();
    chat.assignedTo = currentUser.id;
    
    setChats(chats);
    openChat(activeChatSessionId);
    
    input.value = '';
}

function closeChatWithStatus(status) {
    if (!activeChatSessionId) return;
    
    const chats = getChats();
    const chat = chats.find(c => c.sessionId === activeChatSessionId);
    if (!chat) return;
    
    const statusNames = { resolved: 'Вопрос решен', followup: 'Требуется дальнейшее общение' };
    const comment = prompt(`Комментарий к закрытию чата (${statusNames[status]}):`);
    if (comment === null) return; // Cancelled
    
    chat.status = 'closed';
    chat.closeStatus = status;
    chat.closeComment = comment;
    chat.closedAt = new Date().toISOString();
    chat.closedBy = currentUser.id;
    
    // If followup required, create a ticket
    if (status === 'followup') {
        const tickets = DB.getTickets();
        const newTicket = {
            id: 't' + Date.now(),
            client: '',
            subject: 'Требуется общение: ' + chat.sessionId.substring(0, 16),
            service: 'other',
            description: [
                'Создано автоматически из онлайн-чата.',
                '',
                'Комментарий: ' + comment,
                '',
                '--- История чата ---',
                ...chat.messages.map(m => `[${m.time}] ${m.from === 'client' ? 'Клиент' : 'Менеджер'}: ${m.text}`),
            ].join('\n'),
            status: 'new',
            assignee: chat.assignedTo || '',
            priority: 'medium',
            created: new Date().toISOString().split('T')[0],
            updated: new Date().toISOString().split('T')[0],
            messages: comment ? [{ from: currentUser.id, text: comment, time: new Date().toLocaleString('ru-RU') }] : [],
            source: 'livechat',
        };
        tickets.push(newTicket);
        DB.setTickets(tickets);
        showToast('Создана заявка #' + newTicket.id.replace('t', '') + ' для дальнейшего общения');
    } else {
        showToast('Чат закрыт: ' + statusNames[status]);
    }
    
    setChats(chats);
    openChat(activeChatSessionId);
    renderChatList();
}

// Poll for new chat messages
let lastAdminMessageCount = 0;
let lastReopenedChats = new Set();

function pollAdminChats() {
    const chats = getChats();
    const totalMessages = chats.reduce((sum, c) => sum + c.messages.length, 0);
    const hasNew = chats.some(c => c.status === 'open' && c.hasNewMessages);
    
    // Check for reopened chats
    const reopenedChats = new Set(chats.filter(c => c.reopenedBy === 'client' && c.status === 'open').map(c => c.sessionId));
    const newReopened = [...reopenedChats].filter(id => !lastReopenedChats.has(id));
    
    updateChatBadge();
    
    // If on livechat section, update in real-time
    const isOnChatPage = !document.getElementById('section-livechat')?.classList.contains('hidden');
    
    if (isOnChatPage) {
        // Update chat list
        renderChatList();
        
        // If a chat is open, update messages
        if (activeChatSessionId) {
            const chat = chats.find(c => c.sessionId === activeChatSessionId);
            if (chat && totalMessages > lastAdminMessageCount) {
                openChat(activeChatSessionId);
            }
        }
    } else {
        // Show toast notifications
        if (newReopened.length > 0) {
            showToast('Клиент возобновил чат — есть новые вопросы!');
        } else if (hasNew && totalMessages > lastAdminMessageCount) {
            showToast('Новое сообщение в онлайн-чате!');
        }
    }
    
    lastAdminMessageCount = totalMessages;
    lastReopenedChats = reopenedChats;
}

// Poll every 3 seconds
setInterval(pollAdminChats, 3000);

// ==================== SELECTS ====================
function updateClientSelect() {
    const clients = DB.getClients();
    const sel = document.getElementById('ticketClient');
    if (sel) sel.innerHTML = clients.length > 0
        ? clients.map(c => `<option value="${c.id}">${c.company} — ${c.contact}</option>`).join('')
        : '<option value="">Сначала добавьте клиента</option>';
}

function updateAssigneeSelect() {
    const users = DB.getUsers();
    const sel = document.getElementById('ticketAssignee');
    if (sel) sel.innerHTML = users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
}

// ==================== CRUD ====================
function createTicket(e) {
    e.preventDefault();
    const clientId = document.getElementById('ticketClient').value;
    if (!clientId) { showToast('Сначала добавьте клиента'); return; }
    
    const tickets = DB.getTickets();
    const newTicket = {
        id: 't' + Date.now(),
        client: clientId,
        subject: document.getElementById('ticketSubject').value.trim(),
        service: document.getElementById('ticketService').value,
        description: document.getElementById('ticketDescription').value.trim(),
        status: 'new',
        assignee: document.getElementById('ticketAssignee').value,
        priority: document.getElementById('ticketPriority').value,
        created: new Date().toISOString().split('T')[0],
        updated: new Date().toISOString().split('T')[0],
        messages: [],
        source: 'manual',
    };
    tickets.push(newTicket);
    DB.setTickets(tickets);
    closeModal('newTicketModal');
    document.getElementById('newTicketForm').reset();
    renderAll();
    showToast('Заявка создана');
}

async function createClient(e) {
    e.preventDefault();
    const defaultPassword = 'client123';
    const passwordHash = await hashPassword(defaultPassword);
    const clients = DB.getClients();
    clients.push({
        id: 'c' + Date.now(),
        company: document.getElementById('clientCompany').value.trim(),
        contact: document.getElementById('clientContact').value.trim(),
        phone: document.getElementById('clientPhone').value.trim(),
        email: document.getElementById('clientEmail').value.trim(),
        passwordHash,
        plan: document.getElementById('clientPlan').value,
        created: new Date().toISOString().split('T')[0],
        consentGiven: true,
        consentDate: new Date().toISOString(),
        source: 'admin',
    });
    DB.setClients(clients);
    closeModal('newClientModal');
    document.getElementById('newClientForm').reset();
    renderAll();
    showToast('Клиент добавлен. Пароль по умолчанию: client123 (рекомендуется сменить)');
}

async function resetClientPassword(clientId) {
    if (!confirm('Сбросить пароль клиента на client123?')) return;
    const defaultPassword = 'client123';
    const passwordHash = await hashPassword(defaultPassword);
    const clients = DB.getClients();
    const client = clients.find(c => c.id === clientId);
    if (client) {
        client.passwordHash = passwordHash;
        localStorage.setItem('crm_clients', JSON.stringify(clients));
        showToast('Пароль сброшен. Новый пароль: client123');
    }
}

async function createUser(e) {
    e.preventDefault();
    const users = DB.getUsers();
    const email = document.getElementById('newUserEmail').value.trim();
    if (users.find(u => u.email === email)) { showToast('Пользователь с таким email уже существует'); return; }
    const passwordHash = await hashPassword(document.getElementById('newUserPassword').value);
    users.push({
        id: 'u' + Date.now(),
        name: document.getElementById('newUserName').value.trim(),
        email,
        passwordHash,
        role: document.getElementById('newUserRole').value,
        created: new Date().toISOString().split('T')[0],
        consentGiven: true,
        consentDate: new Date().toISOString(),
    });
    DB.setUsers(users);
    closeModal('newUserModal');
    document.getElementById('newUserForm').reset();
    renderAll();
    showToast('Пользователь создан');
}

async function resetUserPassword(userId) {
    if (!confirm('Сбросить пароль пользователя на user123?')) return;
    const defaultPassword = 'user123';
    const passwordHash = await hashPassword(defaultPassword);
    const users = DB.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
        user.passwordHash = passwordHash;
        localStorage.setItem('crm_users', JSON.stringify(users));
        showToast('Пароль сброшен. Новый пароль: user123');
    }
}

function deleteTicket(id) {
    if (!confirm('Удалить заявку?')) return;
    DB.setTickets(DB.getTickets().filter(t => t.id !== id));
    renderAll();
    showToast('Заявка удалена');
}

function deleteClient(id) {
    if (!confirm('Удалить клиента?')) return;
    DB.setClients(DB.getClients().filter(c => c.id !== id));
    renderAll();
    showToast('Клиент удален');
}

function deleteUser(id) {
    if (!confirm('Удалить пользователя?')) return;
    DB.setUsers(DB.getUsers().filter(u => u.id !== id));
    renderAll();
    showToast('Пользователь удален');
}

function openChangePasswordModal() {
    openModal('changePasswordModal');
}

async function changeAdminPassword(e) {
    e.preventDefault();
    const current = document.getElementById('adminCurrentPassword').value;
    const newPass = document.getElementById('adminNewPassword').value;
    const confirm = document.getElementById('adminConfirmPassword').value;
    
    if (!current || !newPass || !confirm) {
        showToast('Заполните все поля');
        return;
    }
    
    if (newPass.length < 6) {
        showToast('Пароль должен быть не менее 6 символов');
        return;
    }
    
    if (newPass !== confirm) {
        showToast('Пароли не совпадают');
        return;
    }
    
    const currentHash = await hashPassword(current);
    if (currentHash !== currentUser.passwordHash) {
        showToast('Неверный текущий пароль');
        return;
    }
    
    const newHash = await hashPassword(newPass);
    const users = DB.getUsers();
    const user = users.find(u => u.id === currentUser.id);
    if (user) {
        user.passwordHash = newHash;
        localStorage.setItem('crm_users', JSON.stringify(users));
        currentUser.passwordHash = newHash;
        document.getElementById('adminCurrentPassword').value = '';
        document.getElementById('adminNewPassword').value = '';
        document.getElementById('adminConfirmPassword').value = '';
        closeModal('changePasswordModal');
        showToast('Пароль изменен');
    }
}

// ==================== TICKET DETAIL ====================
function showTicketDetail(id) {
    const ticket = DB.getTickets().find(t => t.id === id);
    if (!ticket) return;
    const client = DB.getClients().find(c => c.id === ticket.client);
    const assignee = DB.getUsers().find(u => u.id === ticket.assignee);
    const statusNames = { new: 'Новая', progress: 'В работе', waiting: 'Ожидание', done: 'Выполнена' };
    const serviceNames = { dev: 'Доработка', hosting: 'Размещение', marking: 'Маркировка', support: 'Обслуживание', outsourcing: 'IT-аутсорсинг', other: 'Другое' };
    const priorityNames = { low: 'Низкий', medium: 'Средний', high: 'Высокий', urgent: 'Срочный' };
    const priorityColors = { low: 'text-gray-500', medium: 'text-blue-500', high: 'text-orange-500', urgent: 'text-red-500' };
    const sourceNames = { 'landing-form': 'С сайта', 'manual': 'Вручную' };
    const sourceColors = { 'landing-form': 'bg-green-100 text-green-700', 'manual': 'bg-gray-100 text-gray-700' };
    
    document.getElementById('detailTitle').textContent = ticket.subject;
    document.getElementById('ticketDetail').innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <div><span class="text-sm text-gray-500">Статус</span>
                <select onchange="updateTicketStatus('${id}', this.value)" class="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-brand-red outline-none">
                    <option value="new" ${ticket.status === 'new' ? 'selected' : ''}>Новая</option>
                    <option value="progress" ${ticket.status === 'progress' ? 'selected' : ''}>В работе</option>
                    <option value="waiting" ${ticket.status === 'waiting' ? 'selected' : ''}>Ожидание</option>
                    <option value="done" ${ticket.status === 'done' ? 'selected' : ''}>Выполнена</option>
                </select>
            </div>
            <div><span class="text-sm text-gray-500">Приоритет</span>
                <div class="mt-1 font-medium ${priorityColors[ticket.priority]}">${priorityNames[ticket.priority]}</div>
            </div>
            <div><span class="text-sm text-gray-500">Клиент</span>
                <div class="mt-1 font-medium text-brand-dark">${client ? client.company : 'Аноним'}${client?.source === 'landing-form' ? ' <span class="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-600">с сайта</span>' : ''}</div>
            </div>
            <div><span class="text-sm text-gray-500">Ответственный</span>
                <div class="mt-1 font-medium text-brand-dark">${assignee ? assignee.name : '—'}</div>
            </div>
            <div><span class="text-sm text-gray-500">Услуга</span>
                <div class="mt-1 text-gray-700">${serviceNames[ticket.service]}</div>
            </div>
            <div><span class="text-sm text-gray-500">Источник</span>
                <div class="mt-1"><span class="px-2 py-1 text-xs font-medium rounded-full ${sourceColors[ticket.source] || sourceColors.manual}">${sourceNames[ticket.source] || 'Вручную'}</span></div>
            </div>
            <div><span class="text-sm text-gray-500">Создана</span>
                <div class="mt-1 text-gray-700">${ticket.created}</div>
            </div>
            ${client?.phone ? `<div><span class="text-sm text-gray-500">Телефон</span><div class="mt-1 text-gray-700">${client.phone}</div></div>` : ''}
            ${client?.email ? `<div><span class="text-sm text-gray-500">Email</span><div class="mt-1 text-gray-700">${client.email}</div></div>` : ''}
        </div>
        <div>
            <span class="text-sm text-gray-500">Описание</span>
            <p class="mt-2 text-gray-700 bg-gray-50 p-4 rounded-xl">${ticket.description || 'Нет описания'}</p>
        </div>
        <div>
            <h4 class="font-medium text-brand-dark mb-3">Комментарии</h4>
            <div class="space-y-3 mb-4 max-h-48 overflow-y-auto">
                ${(ticket.messages || []).length > 0
                    ? ticket.messages.map(m => {
                        const author = DB.getUsers().find(u => u.id === m.from);
                        const client = DB.getClients().find(c => c.id === m.from);
                        const authorName = author ? author.name : (client ? client.contact : 'Система');
                        return `<div class="bg-gray-50 p-3 rounded-xl">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-sm font-medium text-brand-dark">${authorName}</span>
                                <span class="text-xs text-gray-400">${m.time}</span>
                            </div>
                            <p class="text-sm text-gray-600">${m.text}</p>
                        </div>`;
                    }).join('')
                    : '<p class="text-sm text-gray-400">Нет комментариев</p>'}
            </div>
            <div class="flex gap-2">
                <input type="text" id="newComment" placeholder="Добавить комментарий..." class="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-brand-red outline-none" onkeydown="if(event.key==='Enter')addComment('${id}')">
                <button onclick="addComment('${id}')" class="px-4 py-2.5 bg-brand-red text-white rounded-xl hover:bg-brand-red-dark transition-colors text-sm font-medium">Отправить</button>
            </div>
        </div>
    `;
    openModal('ticketDetailModal');
}

function updateTicketStatus(id, status) {
    const tickets = DB.getTickets();
    const ticket = tickets.find(t => t.id === id);
    if (ticket) {
        ticket.status = status;
        ticket.updated = new Date().toISOString().split('T')[0];
        DB.setTickets(tickets);
        renderAll();
        showToast('Статус обновлен');
    }
}

function addComment(ticketId) {
    const input = document.getElementById('newComment');
    const text = input.value.trim();
    if (!text) return;
    const tickets = DB.getTickets();
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
        if (!ticket.messages) ticket.messages = [];
        ticket.messages.push({ from: currentUser.id, text, time: new Date().toLocaleString('ru-RU') });
        ticket.updated = new Date().toISOString().split('T')[0];
        DB.setTickets(tickets);
        showTicketDetail(ticketId);
        showToast('Комментарий добавлен');
    }
}

// ==================== DRAG & DROP ====================
let draggedElement = null;

function handleDragStart(e) {
    draggedElement = e.target.closest('[draggable]');
    if (draggedElement) draggedElement.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedElement?.dataset.id || '');
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const column = e.target.closest('.kanban-column');
    if (column) column.classList.add('drag-over');
}

function handleDrop(e, status) {
    e.preventDefault();
    const column = e.target.closest('.kanban-column');
    if (column) column.classList.remove('drag-over');
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
        const ticketId = draggedElement.dataset.id;
        const tickets = DB.getTickets();
        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket) {
            ticket.status = status;
            ticket.updated = new Date().toISOString().split('T')[0];
            DB.setTickets(tickets);
            renderAll();
            showToast('Заявка перемещена');
        }
        draggedElement = null;
    }
}

document.querySelectorAll('.kanban-column').forEach(col => {
    col.addEventListener('dragleave', (e) => { if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over'); });
});

// ==================== MODALS ====================
function openModal(id) { document.getElementById(id).classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); document.body.style.overflow = ''; }
function openNewTicketModal() { updateClientSelect(); updateAssigneeSelect(); openModal('newTicketModal'); }
function openNewClientModal() { openModal('newClientModal'); }
function openNewUserModal() { openModal('newUserModal'); }

// ==================== TOAST ====================
function showToast(text) {
    const toast = document.getElementById('toast');
    document.getElementById('toastText').textContent = text;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('translate-y-0', 'opacity-100'), 10);
    setTimeout(() => { toast.classList.remove('translate-y-0', 'opacity-100'); setTimeout(() => toast.classList.add('hidden'), 300); }, 3000);
}

// ==================== INIT ====================
// Check session
const session = DB.getSession();
if (session) {
    const user = DB.getUsers().find(u => u.id === session.userId);
    if (user) {
        currentUser = user;
        showApp();
    }
}
