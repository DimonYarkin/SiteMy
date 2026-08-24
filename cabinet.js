// ==================== DATA STORE ====================
const DB = {
    getClients() { return JSON.parse(localStorage.getItem('crm_clients') || '[]'); },
    getTickets() { return JSON.parse(localStorage.getItem('crm_tickets') || '[]'); },
    setTickets(v) { localStorage.setItem('crm_tickets', JSON.stringify(v)); },
    getUsers() { return JSON.parse(localStorage.getItem('crm_users') || '[]'); },
    getSession() { return JSON.parse(localStorage.getItem('cabinet_session') || 'null'); },
    setSession(v) { localStorage.setItem('cabinet_session', JSON.stringify(v)); },
    getConsentLog() { return JSON.parse(localStorage.getItem('crm_consent_log') || '[]'); },
    addConsentLog(entry) { const log = this.getConsentLog(); log.push(entry); localStorage.setItem('crm_consent_log', JSON.stringify(log)); },
};

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
let currentClient = null;

function switchCabinetTab(tab) {
    document.getElementById('cabinetLoginTab').className = tab === 'login' ? 'flex-1 py-2.5 text-sm font-medium rounded-lg bg-white text-brand-dark shadow-sm transition-all' : 'flex-1 py-2.5 text-sm font-medium rounded-lg text-gray-500 transition-all';
    document.getElementById('cabinetRegisterTab').className = tab === 'register' ? 'flex-1 py-2.5 text-sm font-medium rounded-lg bg-white text-brand-dark shadow-sm transition-all' : 'flex-1 py-2.5 text-sm font-medium rounded-lg text-gray-500 transition-all';
    document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
    document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
}

async function handleLogin(e) {
    e.preventDefault();
    
    // Check consent
    const consentCheckbox = document.getElementById('loginConsent');
    if (!consentCheckbox?.checked) {
        const err = document.getElementById('loginError');
        err.textContent = 'Необходимо дать согласие на обработку персональных данных';
        err.classList.remove('hidden');
        setTimeout(() => err.classList.add('hidden'), 3000);
        return;
    }
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const passwordHash = await hashPassword(password);
    const clients = DB.getClients();
    const client = clients.find(c => c.email === email && c.passwordHash === passwordHash);
    
    if (client) {
        currentClient = client;
        DB.setSession({ clientId: client.id, loginAt: new Date().toISOString() });
        // Log consent
        DB.addConsentLog({
            clientId: client.id,
            action: 'login',
            timestamp: new Date().toISOString(),
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
    
    const company = document.getElementById('regCompany').value.trim();
    const contact = document.getElementById('regContact').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const clients = DB.getClients();
    
    if (clients.find(c => c.email === email)) {
        const err = document.getElementById('registerError');
        err.textContent = 'Клиент с таким email уже существует';
        err.classList.remove('hidden');
        setTimeout(() => err.classList.add('hidden'), 3000);
        return;
    }
    
    const passwordHash = await hashPassword(password);
    
    const newClient = {
        id: 'c' + Date.now(),
        company,
        contact,
        phone,
        email,
        passwordHash,
        plan: 'none',
        created: new Date().toISOString().split('T')[0],
        source: 'cabinet',
        consentGiven: true,
        consentDate: new Date().toISOString(),
    };
    clients.push(newClient);
    localStorage.setItem('crm_clients', JSON.stringify(clients));
    
    // Log consent
    DB.addConsentLog({
        clientId: newClient.id,
        action: 'registration',
        email: email,
        timestamp: new Date().toISOString(),
    });
    
    currentClient = newClient;
    DB.setSession({ clientId: newClient.id, loginAt: new Date().toISOString() });
    showApp();
}

function handleLogout() {
    currentClient = null;
    localStorage.removeItem('cabinet_session');
    document.getElementById('app').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
}

function showApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    
    const initials = currentClient.contact.split(' ').map(w => w[0]).join('').toUpperCase();
    document.getElementById('userName').textContent = currentClient.contact;
    document.getElementById('userAvatar').textContent = initials;
    
    renderProfile();
    renderTickets();
}

// ==================== NAVIGATION ====================
function showSection(section) {
    document.querySelectorAll('[id^="section-"]').forEach(el => el.classList.add('hidden'));
    document.getElementById('section-' + section).classList.remove('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-red-50', 'text-brand-red');
        btn.classList.add('text-gray-600');
    });
    const activeBtn = document.querySelector(`.nav-btn[data-section="${section}"]`);
    if (activeBtn) {
        activeBtn.classList.add('bg-red-50', 'text-brand-red');
        activeBtn.classList.remove('text-gray-600');
    }
    
    if (section === 'profile') renderProfile();
    if (section === 'tickets') renderTickets();
}

function toggleMobileMenu() {
    document.getElementById('mobileMenu').classList.toggle('hidden');
}

// ==================== RENDER ====================
function renderProfile() {
    const c = currentClient;
    const initials = c.contact.split(' ').map(w => w[0]).join('').toUpperCase();
    
    document.getElementById('profileAvatar').textContent = initials;
    document.getElementById('profileCompany').textContent = c.company;
    document.getElementById('profileContact').textContent = c.contact;
    document.getElementById('profileEmail').textContent = c.email || '—';
    document.getElementById('profilePhone').textContent = c.phone || '—';
    
    const planNames = { none: 'Не подключен', start: 'Старт', business: 'Бизнес', corporation: 'Корпорация' };
    document.getElementById('profilePlan').textContent = planNames[c.plan] || '—';
    
    // Stats
    const tickets = DB.getTickets().filter(t => t.client === c.id);
    document.getElementById('statTotal').textContent = tickets.length;
    document.getElementById('statActive').textContent = tickets.filter(t => t.status !== 'done').length;
    document.getElementById('statDone').textContent = tickets.filter(t => t.status === 'done').length;
    
    // Recent activity
    const allMessages = [];
    tickets.forEach(t => {
        (t.messages || []).forEach(m => {
            allMessages.push({ ticketId: t.id, ticketSubject: t.subject, ...m });
        });
    });
    allMessages.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    const users = DB.getUsers();
    document.getElementById('recentActivity').innerHTML = allMessages.length > 0 
        ? allMessages.slice(0, 5).map(m => {
            const author = users.find(u => u.id === m.from);
            const client = DB.getClients().find(cl => cl.id === m.from);
            const authorName = author ? author.name : (client ? client.contact : 'Система');
            return `<div class="px-6 py-4 hover:bg-gray-50 cursor-pointer" onclick="showTicketDetail('${m.ticketId}')">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-sm font-medium text-brand-dark">${m.ticketSubject}</span>
                    <span class="text-xs text-gray-400">${m.time}</span>
                </div>
                <p class="text-sm text-gray-600 truncate">${authorName}: ${m.text}</p>
            </div>`;
        }).join('')
        : '<div class="p-6 text-center text-gray-400 text-sm">Нет обновлений</div>';
}

function renderTickets() {
    const tickets = DB.getTickets().filter(t => t.client === currentClient.id);
    const users = DB.getUsers();
    
    const statusColors = { new: 'bg-yellow-100 text-yellow-700', progress: 'bg-blue-100 text-blue-700', waiting: 'bg-orange-100 text-orange-700', done: 'bg-green-100 text-green-700' };
    const statusNames = { new: 'Новая', progress: 'В работе', waiting: 'Ожидание', done: 'Выполнена' };
    const serviceNames = { dev: 'Доработка 1С', hosting: 'Размещение', marking: 'Маркировка', support: 'Обслуживание', outsourcing: 'IT-аутсорсинг', other: 'Другое' };
    const priorityColors = { low: 'border-l-gray-300', medium: 'border-l-blue-400', high: 'border-l-orange-400', urgent: 'border-l-red-500' };
    const priorityNames = { low: 'Низкий', medium: 'Средний', high: 'Высокий', urgent: 'Срочный' };
    
    const sorted = [...tickets].sort((a, b) => new Date(b.updated) - new Date(a.updated));
    
    document.getElementById('ticketsList').innerHTML = sorted.length > 0 
        ? sorted.map(t => {
            const assignee = users.find(u => u.id === t.assignee);
            const msgCount = (t.messages || []).length;
            return `<div class="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer border-l-4 ${priorityColors[t.priority]}" onclick="showTicketDetail('${t.id}')">
                <div class="p-6">
                    <div class="flex items-start justify-between mb-3">
                        <div>
                            <div class="flex items-center gap-3 mb-2">
                                <span class="text-sm text-gray-400">${t.id.replace('t', '#')}</span>
                                <span class="px-3 py-1 text-xs font-medium rounded-full ${statusColors[t.status]}">${statusNames[t.status]}</span>
                                <span class="text-xs text-gray-400">${serviceNames[t.service] || t.service}</span>
                            </div>
                            <h3 class="text-lg font-bold text-brand-dark">${t.subject}</h3>
                        </div>
                        <div class="text-right">
                            <div class="text-xs text-gray-400">${t.updated}</div>
                            ${assignee ? `<div class="text-xs text-gray-500 mt-1">${assignee.name}</div>` : ''}
                        </div>
                    </div>
                    <p class="text-sm text-gray-600 mb-4 line-clamp-2">${t.description || 'Нет описания'}</p>
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2 text-sm text-gray-500">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                            ${msgCount} ${msgCount === 1 ? 'комментарий' : msgCount < 5 ? 'комментария' : 'комментариев'}
                        </div>
                        <span class="text-xs px-2 py-1 rounded-lg bg-gray-50 text-gray-500">Приоритет: ${priorityNames[t.priority]}</span>
                    </div>
                </div>
            </div>`;
        }).join('')
        : '<div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center"><svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg><h3 class="text-lg font-bold text-gray-400 mb-2">Заявок пока нет</h3><p class="text-gray-400">Обратитесь к менеджеру для создания заявки</p></div>';
}

function showTicketDetail(id) {
    const ticket = DB.getTickets().find(t => t.id === id);
    if (!ticket || ticket.client !== currentClient.id) return;
    
    const users = DB.getUsers();
    const clients = DB.getClients();
    const assignee = users.find(u => u.id === ticket.assignee);
    const statusColors = { new: 'bg-yellow-100 text-yellow-700', progress: 'bg-blue-100 text-blue-700', waiting: 'bg-orange-100 text-orange-700', done: 'bg-green-100 text-green-700' };
    const statusNames = { new: 'Новая', progress: 'В работе', waiting: 'Ожидание', done: 'Выполнена' };
    const serviceNames = { dev: 'Доработка 1С', hosting: 'Размещение', marking: 'Маркировка', support: 'Обслуживание', outsourcing: 'IT-аутсорсинг', other: 'Другое' };
    const priorityNames = { low: 'Низкий', medium: 'Средний', high: 'Высокий', urgent: 'Срочный' };
    const priorityColors = { low: 'text-gray-500', medium: 'text-blue-500', high: 'text-orange-500', urgent: 'text-red-500' };
    
    document.getElementById('ticketDetail').innerHTML = `
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div class="p-6 border-b border-gray-100">
                <div class="flex items-center gap-3 mb-4">
                    <span class="text-sm text-gray-400">${ticket.id.replace('t', '#')}</span>
                    <span class="px-3 py-1 text-xs font-medium rounded-full ${statusColors[ticket.status]}">${statusNames[ticket.status]}</span>
                </div>
                <h2 class="text-2xl font-bold text-brand-dark mb-2">${ticket.subject}</h2>
                <p class="text-gray-600">${ticket.description || 'Нет описания'}</p>
            </div>
            <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-gray-50">
                <div>
                    <div class="text-xs text-gray-400 mb-1">Услуга</div>
                    <div class="text-sm font-medium text-gray-700">${serviceNames[ticket.service] || ticket.service}</div>
                </div>
                <div>
                    <div class="text-xs text-gray-400 mb-1">Приоритет</div>
                    <div class="text-sm font-medium ${priorityColors[ticket.priority]}">${priorityNames[ticket.priority]}</div>
                </div>
                <div>
                    <div class="text-xs text-gray-400 mb-1">Ответственный</div>
                    <div class="text-sm font-medium text-gray-700">${assignee ? assignee.name : 'Не назначен'}</div>
                </div>
                <div>
                    <div class="text-xs text-gray-400 mb-1">Создана</div>
                    <div class="text-sm font-medium text-gray-700">${ticket.created}</div>
                </div>
            </div>
            <div class="p-6">
                <h3 class="font-bold text-brand-dark mb-4 flex items-center gap-2">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                    Комментарии <span class="text-sm font-normal text-gray-400">(${(ticket.messages || []).length})</span>
                </h3>
                <div class="space-y-4 mb-6 max-h-96 overflow-y-auto" id="commentsList">
                    ${(ticket.messages || []).length > 0 
                        ? ticket.messages.map(m => {
                            const author = users.find(u => u.id === m.from);
                            const client = clients.find(c => c.id === m.from);
                            const isClient = m.from === currentClient.id;
                            const authorName = isClient ? 'Вы' : (author ? author.name : (client ? client.contact : 'Система'));
                            return `<div class="flex gap-3 ${isClient ? 'flex-row-reverse' : ''}">
                                <div class="w-8 h-8 rounded-full ${isClient ? 'bg-brand-orange' : 'bg-brand-red'} flex items-center justify-center text-white text-xs font-bold flex-shrink-0">${authorName[0]}</div>
                                <div class="flex-1 ${isClient ? 'text-right' : ''}">
                                    <div class="flex items-center gap-2 mb-1 ${isClient ? 'justify-end' : ''}">
                                        <span class="text-sm font-medium text-brand-dark">${authorName}</span>
                                        <span class="text-xs text-gray-400">${m.time}</span>
                                    </div>
                                    <div class="inline-block px-4 py-2.5 rounded-2xl text-sm ${isClient ? 'bg-brand-red text-white rounded-br-md' : 'bg-gray-100 text-gray-700 rounded-bl-md'}">${m.text}</div>
                                </div>
                            </div>`;
                        }).join('')
                        : '<p class="text-center text-gray-400 text-sm py-8">Комментариев пока нет</p>'}
                </div>
                ${ticket.status !== 'done' ? `
                <div class="flex gap-3 pt-4 border-t border-gray-100">
                    <input type="text" id="newComment" placeholder="Написать комментарий..." class="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-red outline-none transition-all text-sm" onkeydown="if(event.key==='Enter')addComment('${id}')">
                    <button onclick="addComment('${id}')" class="px-6 py-3 bg-brand-red text-white font-semibold rounded-xl hover:bg-brand-red-dark transition-all shadow-lg shadow-brand-red/20">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                    </button>
                </div>` : '<div class="text-center py-4 text-gray-400 text-sm">Заявка выполнена. Комментарии закрыты.</div>'}
            </div>
        </div>
    `;
    
    showSection('ticket-detail');
    
    // Scroll to bottom of comments
    setTimeout(() => {
        const list = document.getElementById('commentsList');
        if (list) list.scrollTop = list.scrollHeight;
    }, 100);
}

function addComment(ticketId) {
    const input = document.getElementById('newComment');
    const text = input.value.trim();
    if (!text) return;
    
    const tickets = DB.getTickets();
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket || ticket.client !== currentClient.id) return;
    
    if (!ticket.messages) ticket.messages = [];
    ticket.messages.push({
        from: currentClient.id,
        text,
        time: new Date().toLocaleString('ru-RU'),
    });
    ticket.updated = new Date().toISOString().split('T')[0];
    DB.setTickets(tickets);
    
    showTicketDetail(ticketId);
    showToast('Комментарий отправлен');
}

// ==================== PASSWORD CHANGE ====================
function togglePasswordChange() {
    document.getElementById('passwordChangeForm').classList.toggle('hidden');
}

async function changePassword() {
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    
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
    if (currentHash !== currentClient.passwordHash) {
        showToast('Неверный текущий пароль');
        return;
    }
    
    const newHash = await hashPassword(newPass);
    const clients = DB.getClients();
    const client = clients.find(c => c.id === currentClient.id);
    if (client) {
        client.passwordHash = newHash;
        localStorage.setItem('crm_clients', JSON.stringify(clients));
        currentClient.passwordHash = newHash;
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        togglePasswordChange();
        showToast('Пароль изменен');
    }
}

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
    const client = DB.getClients().find(c => c.id === session.clientId);
    if (client) {
        currentClient = client;
        showApp();
    }
}
