// ==================== SITE SETTINGS ====================
function loadSiteSettings() {
    const settings = JSON.parse(localStorage.getItem('site_settings') || '{}');
    
    // Update phone numbers
    if (settings.phone) {
        document.querySelectorAll('[data-setting="phone"]').forEach(el => {
            el.textContent = settings.phone;
            if (el.tagName === 'A') el.href = 'tel:' + settings.phone.replace(/\D/g, '');
        });
    }
    
    // Update email
    if (settings.email) {
        document.querySelectorAll('[data-setting="email"]').forEach(el => {
            el.textContent = settings.email;
            if (el.tagName === 'A') el.href = 'mailto:' + settings.email;
        });
    }
    
    // Update address
    if (settings.address) {
        document.querySelectorAll('[data-setting="address"]').forEach(el => {
            el.textContent = settings.address;
        });
    }
    
    // Update social links
    if (settings.whatsapp) {
        document.querySelectorAll('[data-setting="whatsapp"]').forEach(el => {
            el.href = settings.whatsapp;
        });
    }
    if (settings.telegram) {
        document.querySelectorAll('[data-setting="telegram"]').forEach(el => {
            el.href = settings.telegram;
        });
    }
    if (settings.max) {
        document.querySelectorAll('[data-setting="max"]').forEach(el => {
            el.href = settings.max;
        });
    }
}

// Load settings on page load
document.addEventListener('DOMContentLoaded', loadSiteSettings);

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

// ==================== SCROLL ANIMATIONS ====================
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));

// ==================== HEADER ====================
const header = document.getElementById('header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    if (currentScroll > 50) {
        header.classList.add('header-scrolled');
    } else {
        header.classList.remove('header-scrolled');
    }
    lastScroll = currentScroll;
});

// ==================== MOBILE MENU ====================
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');
let menuOpen = false;

burger.addEventListener('click', () => {
    menuOpen = !menuOpen;
    mobileMenu.classList.toggle('hidden');
    if (menuOpen) {
        setTimeout(() => mobileMenu.classList.add('open'), 10);
    } else {
        mobileMenu.classList.remove('open');
    }
});

document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
        menuOpen = false;
        mobileMenu.classList.remove('open');
        setTimeout(() => mobileMenu.classList.add('hidden'), 300);
    });
});

// ==================== SMOOTH SCROLL ====================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offset = 80;
            const position = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top: position, behavior: 'smooth' });
        }
    });
});

// ==================== CAROUSEL ====================
let currentSlide = 0;
const totalSlides = 3;
const carousel = document.getElementById('carousel');

function goToSlide(index) {
    currentSlide = index;
    carousel.style.transform = `translateX(-${currentSlide * 100}%)`;
    document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlide);
        dot.style.background = i === currentSlide ? '#E31E24' : '#D1D5DB';
    });
}

// Auto-advance carousel
setInterval(() => {
    goToSlide((currentSlide + 1) % totalSlides);
}, 5000);

// Touch support for carousel
let touchStartX = 0;
let touchEndX = 0;

carousel?.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

carousel?.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
        if (diff > 0 && currentSlide < totalSlides - 1) {
            goToSlide(currentSlide + 1);
        } else if (diff < 0 && currentSlide > 0) {
            goToSlide(currentSlide - 1);
        }
    }
}, { passive: true });

// ==================== CONTACT FORM ====================
const contactForm = document.getElementById('contactForm');
contactForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Check consent
    const consentCheckbox = document.getElementById('form-consent');
    if (!consentCheckbox?.checked) {
        showToast('Необходимо дать согласие на обработку персональных данных');
        return;
    }
    
    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData);
    
    // Find or create client
    const clients = JSON.parse(localStorage.getItem('crm_clients') || '[]');
    let client = null;
    
    if (data.email) {
        client = clients.find(c => c.email === data.email);
    }
    
    if (!client) {
        // Create anonymous client from form data
        client = {
            id: 'c' + Date.now(),
            company: data.company || 'Анонимный клиент',
            contact: data.name || 'Аноним',
            phone: data.phone || '',
            email: data.email || '',
            passwordHash: '',
            plan: 'none',
            created: new Date().toISOString().split('T')[0],
            consentGiven: true,
            consentDate: new Date().toISOString(),
            source: 'landing-form',
        };
        clients.push(client);
        localStorage.setItem('crm_clients', JSON.stringify(clients));
    }
    
    // Create ticket in CRM
    const tickets = JSON.parse(localStorage.getItem('crm_tickets') || '[]');
    const serviceMap = {
        'dev': 'dev',
        'hosting': 'hosting',
        'marking': 'marking',
        'support': 'support',
        'outsourcing': 'outsourcing',
        'other': 'other',
    };
    
    const newTicket = {
        id: 't' + Date.now(),
        client: client.id,
        subject: data.message ? data.message.substring(0, 100) : 'Заявка с сайта',
        service: serviceMap[data.service] || 'other',
        description: [
            data.name ? `Имя: ${data.name}` : '',
            data.phone ? `Телефон: ${data.phone}` : '',
            data.email ? `Email: ${data.email}` : '',
            data.company ? `Компания: ${data.company}` : '',
            data.message ? `Сообщение: ${data.message}` : '',
        ].filter(Boolean).join('\n'),
        status: 'new',
        assignee: '',
        priority: 'medium',
        created: new Date().toISOString().split('T')[0],
        updated: new Date().toISOString().split('T')[0],
        messages: [],
        source: 'landing-form',
    };
    
    tickets.push(newTicket);
    localStorage.setItem('crm_tickets', JSON.stringify(tickets));
    
    // Log consent
    const consentLog = JSON.parse(localStorage.getItem('crm_consent_log') || '[]');
    consentLog.push({
        clientId: client.id,
        action: 'contact_form',
        email: data.email || '',
        timestamp: new Date().toISOString(),
    });
    localStorage.setItem('crm_consent_log', JSON.stringify(consentLog));
    
    showToast('Заявка отправлена! Мы перезвоним в течение 30 минут.');
    contactForm.reset();
});

// ==================== AUTH MODAL ====================
const authModal = document.getElementById('authModal');
const loginBtn = document.getElementById('loginBtn');
const loginBtnMobile = document.getElementById('loginBtnMobile');

function openAuthModal() {
    authModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
    authModal.classList.add('hidden');
    document.body.style.overflow = '';
}

loginBtn?.addEventListener('click', () => { window.location.href = 'cabinet.html'; });
loginBtnMobile?.addEventListener('click', () => { window.location.href = 'cabinet.html'; });

function switchAuthTab(tab) {
    const loginTab = document.getElementById('authLoginTab');
    const registerTab = document.getElementById('authRegisterTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (tab === 'login') {
        loginTab.className = 'flex-1 py-2.5 text-sm font-medium rounded-lg bg-white text-brand-dark shadow-sm transition-all';
        registerTab.className = 'flex-1 py-2.5 text-sm font-medium rounded-lg text-gray-500 transition-all';
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    } else {
        registerTab.className = 'flex-1 py-2.5 text-sm font-medium rounded-lg bg-white text-brand-dark shadow-sm transition-all';
        loginTab.className = 'flex-1 py-2.5 text-sm font-medium rounded-lg text-gray-500 transition-all';
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    }
}

// Auth form handlers
document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Вход выполнен! (демо)');
    closeAuthModal();
});

document.getElementById('registerForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Регистрация успешна! (демо)');
    closeAuthModal();
});

// ==================== TOAST ====================
function showToast(text) {
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toastText');
    toastText.textContent = text;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('toast-show'), 10);
    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 4000);
}

// ==================== CHAT WIDGET ====================
let chatOpen = false;

// ==================== ONLINE CHAT ====================
const CHAT_STORAGE_KEY = 'crm_chats';

function getChats() {
    return JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '[]');
}

function setChats(chats) {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats));
}

function getOrCreateChatSession() {
    let sessionId = sessionStorage.getItem('chat_session_id');
    if (!sessionId) {
        sessionId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('chat_session_id', sessionId);
    }
    return sessionId;
}

function toggleChat() {
    chatOpen = !chatOpen;
    const panel = document.getElementById('chatPanel');
    const icon = document.getElementById('chatIcon');
    
    if (chatOpen) {
        panel.classList.remove('hidden');
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>';
        loadChatMessages();
    } else {
        panel.classList.add('hidden');
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>';
    }
}

function loadChatMessages() {
    const sessionId = getOrCreateChatSession();
    const chats = getChats();
    const chat = chats.find(c => c.sessionId === sessionId);
    const messagesDiv = document.getElementById('chatMessages');
    
    if (!messagesDiv) return;
    
    // Clear messages
    messagesDiv.innerHTML = '';
    
    // Add greeting
    const greeting = document.createElement('div');
    greeting.className = 'mb-3';
    greeting.innerHTML = '<div class="inline-block px-4 py-2 bg-white rounded-2xl rounded-bl-none text-sm text-gray-700 shadow-sm">Здравствуйте! Напишите ваш вопрос, и наш специалист ответит в ближайшее время.</div>';
    messagesDiv.appendChild(greeting);
    
    // Load existing messages
    if (chat && chat.messages) {
        chat.messages.forEach(msg => {
            appendChatMessage(msg.text, msg.from === 'client', msg.time, false);
        });
    }
    
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function appendChatMessage(text, isClient, time, scroll = true) {
    const messagesDiv = document.getElementById('chatMessages');
    if (!messagesDiv) return;
    
    const msg = document.createElement('div');
    msg.className = `mb-3 ${isClient ? 'text-right' : ''}`;
    
    const timeStr = time || new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    if (isClient) {
        msg.innerHTML = `<div class="inline-block px-4 py-2 bg-brand-red text-white rounded-2xl rounded-br-none text-sm">${escapeHtml(text)}</div>
            <div class="text-xs text-gray-400 mt-1">${timeStr}</div>`;
    } else {
        msg.innerHTML = `<div class="inline-block px-4 py-2 bg-white rounded-2xl rounded-bl-none text-sm text-gray-700 shadow-sm">${escapeHtml(text)}</div>
            <div class="text-xs text-gray-400 mt-1">Менеджер · ${timeStr}</div>`;
    }
    
    messagesDiv.appendChild(msg);
    if (scroll) messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function sendChat() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    const sessionId = getOrCreateChatSession();
    const chats = getChats();
    let chat = chats.find(c => c.sessionId === sessionId);
    
    if (!chat) {
        // New chat
        chat = {
            sessionId,
            status: 'open',
            assignedTo: null,
            messages: [],
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
        };
        chats.push(chat);
    } else if (chat.status === 'closed') {
        // Reopen closed chat
        chat.status = 'open';
        chat.hasNewMessages = true;
        chat.reopenedAt = new Date().toISOString();
        chat.reopenedBy = 'client';
        // Clear previous close status
        chat.closeStatus = null;
        chat.closeComment = null;
    }
    
    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    chat.messages.push({
        from: 'client',
        text,
        time,
        timestamp: new Date().toISOString(),
    });
    chat.lastActivity = new Date().toISOString();
    chat.hasNewMessages = true;
    
    setChats(chats);
    appendChatMessage(text, true, time);
    
    input.value = '';
    
    // Show auto-response
    if (!chat.assignedTo) {
        setTimeout(() => {
            appendChatMessage('Спасибо! Ваше сообщение передано специалисту. Ожидайте ответа.', false);
        }, 1500);
    } else if (chat.reopenedBy === 'client') {
        setTimeout(() => {
            appendChatMessage('Чат возобновлён. Специалист ответит в ближайшее время.', false);
        }, 1500);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Poll for new messages from manager
let lastKnownMessageCount = 0;

function pollChatMessages() {
    const sessionId = sessionStorage.getItem('chat_session_id');
    if (!sessionId) return;
    
    const chats = getChats();
    const chat = chats.find(c => c.sessionId === sessionId);
    if (!chat || !chat.messages.length) return;
    
    const currentCount = chat.messages.length;
    
    // If chat is open, update messages in real-time
    if (chatOpen) {
        if (currentCount > lastKnownMessageCount) {
            // New messages arrived, reload chat
            loadChatMessages();
        }
    } else {
        // If chat is closed, show badge for new manager messages
        const lastMsg = chat.messages[chat.messages.length - 1];
        if (lastMsg.from === 'manager' && currentCount > lastKnownMessageCount) {
            const chatBtn = document.querySelector('#chatWidget button');
            if (chatBtn && !chatBtn.querySelector('.chat-badge')) {
                const badge = document.createElement('div');
                badge.className = 'chat-badge absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold text-brand-dark';
                badge.textContent = '!';
                chatBtn.appendChild(badge);
            }
        }
    }
    
    lastKnownMessageCount = currentCount;
}

// Poll every 2 seconds
setInterval(pollChatMessages, 2000);

// Initialize message count on page load
document.addEventListener('DOMContentLoaded', () => {
    const sessionId = sessionStorage.getItem('chat_session_id');
    if (sessionId) {
        const chats = getChats();
        const chat = chats.find(c => c.sessionId === sessionId);
        if (chat) lastKnownMessageCount = chat.messages.length;
    }
});

// ==================== i18n ====================
const translations = {
    ru: {
        nav_services: 'Услуги', nav_how: 'Как мы работаем', nav_pricing: 'Тарифы', nav_contacts: 'Контакты',
        nav_cabinet: 'Личный кабинет', nav_cta: 'Оставить заявку',
        hero_badge: 'Серверы работают. 99.9% аптайм',
        hero_title: '1С под ключ: от доработки до размещения на наших серверах',
        hero_subtitle: 'Полное IT-обслуживание вашего бизнеса. Вам нужен только интернет — остальное сделаем мы.',
        hero_cta1: 'Получить консультацию', hero_cta2: 'Рассчитать стоимость',
        hero_feat1: '10+ лет опыта', hero_feat2: '500+ клиентов', hero_feat3: '24/7 поддержка',
        value_badge: 'Основное предложение',
        value_title: 'Разместим всю вашу 1С инфраструктуру на наших серверах',
        value_text: 'Профессиональная поддержка 24/7. Больше не нужен IT-отдел и заботы по обслуживанию. Мы возьмем на себя всё: от обновления конфигураций до резервного копирования. Вам нужен только доступ в интернет.',
        value_card1_title: 'Серверы в дата-центре Tier III', value_card1_text: 'Отказоустойчивая инфраструктура с резервированием всех систем',
        value_card2_title: 'Ежедневное резервное копирование', value_card2_text: 'Автоматические бэкапы каждый день с хранением до 30 дней',
        value_card3_title: 'Защита данных по ГОСТ', value_card3_text: 'Соответствие 152-ФЗ и требованиям к хранению персональных данных',
        value_card4_title: 'Техподдержка 24/7', value_card4_text: 'Живые специалисты на связи в любое время дня и ночи',
        services_badge: 'Услуги', services_title: 'Полный спектр услуг для вашего бизнеса', services_subtitle: 'От доработки конфигураций до полного IT-аутсорсинга',
        srv_1_title: 'Доработка 1С', srv_1_1: 'Написание конфигураций с нуля', srv_1_2: 'Модернизация существующих конфигураций', srv_1_3: 'Адаптация под ваши бизнес-процессы',
        srv_2_title: 'Внедрение маркировки', srv_2_1: 'Честный ЗНАК', srv_2_2: 'ПиОт (подключение к оператору)', srv_2_3: 'Полное сопровождение процесса',
        srv_3_title: 'Сопровождение оборудования', srv_3_1: 'Кассовые аппараты', srv_3_2: 'Сканеры штрих-кодов', srv_3_3: 'Терминалы сбора данных',
        srv_4_title: 'Интеграции', srv_4_1: 'С маркетплейсами', srv_4_2: 'С сайтами и CRM', srv_4_3: 'С банковскими системами',
        srv_5_title: 'Обслуживание 1С', srv_5_1: 'Обновления конфигураций', srv_5_2: 'Исправление ошибок', srv_5_3: 'Консультации пользователей',
        srv_6_title: 'IT-аутсорсинг', srv_6_1: 'Полное обслуживание инфраструктуры', srv_6_2: 'Удаленная поддержка сотрудников', srv_6_3: 'Настройка рабочих мест',
        how_badge: 'Процесс', how_title: 'Как мы работаем', how_subtitle: 'Прозрачный процесс от первого контакта до запуска',
        how_1_title: 'Консультация', how_1_text: 'Бесплатный аудит вашей текущей инфраструктуры',
        how_2_title: 'Решение', how_2_text: 'Разработка индивидуального плана работ',
        how_3_title: 'Внедрение', how_3_text: 'Настройка и тестирование решения',
        how_4_title: 'Обучение', how_4_text: 'Обучение вашего персонала работе с системой',
        how_5_title: 'Поддержка', how_5_text: 'Постоянная техническая поддержка 24/7',
        adv_badge: 'Преимущества', adv_title: 'Почему выбирают нас',
        adv_1_title: 'Лет опыта с 1С', adv_1_text: 'Глубокая экспертиза во всех конфигурациях',
        adv_2_title: 'Сертифицированные специалисты', adv_2_text: 'Аттестованные 1С:Профессионал и 1С:Специалист',
        adv_3_title: 'Прозрачное ценообразование', adv_3_text: 'Фиксированные тарифы без скрытых платежей',
        adv_4_title: 'Собственный дата-центр', adv_4_text: 'Оборудование в сертифицированном дата-центре Tier III',
        pricing_badge: 'Тарифы', pricing_title: 'Выберите подходящий тариф', pricing_subtitle: 'Прозрачные цены. Никаких скрытых платежей.',
        plan_start: 'Старт', plan_month: '₽/мес',
        plan_start_1: 'Размещение 1С на сервере', plan_start_2: 'Ежедневное резервное копирование', plan_start_3: 'Техподдержка 9:00–18:00',
        plan_popular: 'Выгодно', plan_business: 'Бизнес',
        plan_biz_1: 'Всё из «Старт»', plan_biz_2: 'Обновления конфигураций', plan_biz_3: 'Техподдержка 24/7', plan_biz_4: 'До 10 часов доработок в месяц',
        plan_corp: 'Корпорация', plan_corp_price: 'Индивидуально',
        plan_corp_1: 'Выделенный сервер', plan_corp_2: 'Персональный менеджер', plan_corp_3: 'Неограниченные доработки', plan_corp_4: 'Выезд специалиста',
        plan_cta: 'Выбрать тариф', plan_cta_contact: 'Связаться с нами',
        test_badge: 'Отзывы', test_title: 'Что говорят наши клиенты',
        test_1_text: '«Перенесли всю 1С на сервера СервисПро. Работает быстрее, чем на наших старых серверах. Поддержка отвечает за минуты, а не дни. Рекомендую!»',
        test_1_name: 'Алексей, директор', test_1_role: 'Торговая компания',
        test_2_text: '«Внедрили маркировку через Честный ЗНАК за 2 недели. Очень довольны скоростью и качеством работы. Теперь все обновления — автоматически.»',
        test_2_name: 'Елена, главный бухгалтер', test_2_role: 'Медицинская компания',
        test_3_text: '«Отказались от собственного IT-отдела и перешли на аутсорсинг. Экономия — более 40% в месяц. Качество обслуживания только выросло.»',
        test_3_name: 'Михаил, CEO', test_3_role: 'Логистическая компания',
        contact_badge: 'Свяжитесь с нами', contact_title: 'Оставьте заявку', contact_subtitle: 'Мы перезвоним в течение 30 минут и проконсультируем по любому вопросу',
        contact_phone_label: 'Телефон', contact_email_label: 'Email', contact_addr_label: 'Адрес', contact_addr_value: 'Москва, ул. Примерная, д. 1',
        form_name: 'Имя', form_phone: 'Телефон *', form_email: 'Email', form_company: 'Компания', form_service: 'Выбор услуги', form_message: 'Сообщение',
        form_service_default: 'Выберите услугу', form_service_dev: 'Доработка 1С', form_service_hosting: 'Размещение на сервере',
        form_service_marking: 'Внедрение маркировки', form_service_support: 'Обслуживание 1С', form_service_outsource: 'IT-аутсорсинг', form_service_other: 'Другое',
        form_submit: 'Отправить заявку', form_privacy: 'Нажимая «Отправить», вы соглашаетесь с политикой конфиденциальности',
        footer_desc: 'Полное IT-обслуживание вашего бизнеса. 1С под ключ.',
        footer_services: 'Услуги', footer_s1: 'Доработка 1С', footer_s2: 'Размещение на серверах', footer_s3: 'Внедрение маркировки', footer_s4: 'IT-аутсорсинг',
        footer_company: 'Компания', footer_c1: 'О нас', footer_c2: 'Отзывы', footer_c3: 'Тарифы', footer_c4: 'Контакты',
        footer_contacts: 'Контакты', footer_addr: 'Москва, ул. Примерная, д. 1', footer_rights: 'Все права защищены.', footer_privacy: 'Политика конфиденциальности',
        auth_title: 'Личный кабинет', auth_subtitle: 'Войдите или зарегистрируйтесь', auth_login: 'Вход', auth_register: 'Регистрация',
        auth_login_btn: 'Войти', auth_register_btn: 'Зарегистрироваться',
        chat_title: 'Онлайн-чат', chat_subtitle: 'Мы ответим в течение минуты', chat_greeting: 'Здравствуйте! Чем могу помочь?',
    },
    en: {
        nav_services: 'Services', nav_how: 'How We Work', nav_pricing: 'Pricing', nav_contacts: 'Contacts',
        nav_cabinet: 'Client Area', nav_cta: 'Get a Quote',
        hero_badge: 'Servers running. 99.9% uptime',
        hero_title: '1C turnkey: from customization to hosting on our servers',
        hero_subtitle: 'Full IT support for your business. You only need the internet — we handle the rest.',
        hero_cta1: 'Get a Consultation', hero_cta2: 'Calculate Cost',
        hero_feat1: '10+ years experience', hero_feat2: '500+ clients', hero_feat3: '24/7 support',
        value_badge: 'Core Offer',
        value_title: 'We\'ll host your entire 1C infrastructure on our servers',
        value_text: 'Professional 24/7 support. No more IT department needed. We handle everything: from configuration updates to backups. All you need is internet access.',
        value_card1_title: 'Tier III Data Center Servers', value_card1_text: 'Fault-tolerant infrastructure with full system redundancy',
        value_card2_title: 'Daily Backups', value_card2_text: 'Automatic daily backups with 30-day retention',
        value_card3_title: 'GOST Data Protection', value_card3_text: 'Compliance with 152-FZ and personal data storage requirements',
        value_card4_title: '24/7 Technical Support', value_card4_text: 'Live specialists available around the clock',
        services_badge: 'Services', services_title: 'Full range of services for your business', services_subtitle: 'From configuration customization to full IT outsourcing',
        srv_1_title: '1C Customization', srv_1_1: 'Building configurations from scratch', srv_1_2: 'Modernizing existing configurations', srv_1_3: 'Adapting to your business processes',
        srv_2_title: 'Marking Implementation', srv_2_1: 'Honest Sign (Chestny Znak)', srv_2_2: 'PiOt (operator connection)', srv_2_3: 'Full process support',
        srv_3_title: 'Equipment Support', srv_3_1: 'Cash registers', srv_3_2: 'Barcode scanners', srv_3_3: 'Data collection terminals',
        srv_4_title: 'Integrations', srv_4_1: 'With marketplaces', srv_4_2: 'With websites and CRM', srv_4_3: 'With banking systems',
        srv_5_title: '1C Maintenance', srv_5_1: 'Configuration updates', srv_5_2: 'Bug fixes', srv_5_3: 'User consultations',
        srv_6_title: 'IT Outsourcing', srv_6_1: 'Full infrastructure maintenance', srv_6_2: 'Remote employee support', srv_6_3: 'Workstation setup',
        how_badge: 'Process', how_title: 'How We Work', how_subtitle: 'Transparent process from first contact to launch',
        how_1_title: 'Consultation', how_1_text: 'Free audit of your current infrastructure',
        how_2_title: 'Solution', how_2_text: 'Development of an individual work plan',
        how_3_title: 'Implementation', how_3_text: 'Configuration and testing of the solution',
        how_4_title: 'Training', how_4_text: 'Training your staff to work with the system',
        how_5_title: 'Support', how_5_text: 'Ongoing 24/7 technical support',
        adv_badge: 'Advantages', adv_title: 'Why Choose Us',
        adv_1_title: 'Years of 1C Experience', adv_1_text: 'Deep expertise in all configurations',
        adv_2_title: 'Certified Specialists', adv_2_text: 'Certified 1C:Professional and 1C:Specialist',
        adv_3_title: 'Transparent Pricing', adv_3_text: 'Fixed tariffs with no hidden fees',
        adv_4_title: 'Own Data Center', adv_4_text: 'Equipment in a certified Tier III data center',
        pricing_badge: 'Pricing', pricing_title: 'Choose the Right Plan', pricing_subtitle: 'Transparent pricing. No hidden fees.',
        plan_start: 'Start', plan_month: '/mo',
        plan_start_1: '1C hosting on server', plan_start_2: 'Daily backups', plan_start_3: 'Support 9:00–18:00',
        plan_popular: 'Best Value', plan_business: 'Business',
        plan_biz_1: 'Everything in Start', plan_biz_2: 'Configuration updates', plan_biz_3: '24/7 support', plan_biz_4: 'Up to 10 hours of customization/month',
        plan_corp: 'Corporation', plan_corp_price: 'Custom',
        plan_corp_1: 'Dedicated server', plan_corp_2: 'Personal manager', plan_corp_3: 'Unlimited customizations', plan_corp_4: 'On-site specialist',
        plan_cta: 'Choose Plan', plan_cta_contact: 'Contact Us',
        test_badge: 'Reviews', test_title: 'What Our Clients Say',
        test_1_text: '"We moved all our 1C to ServisPro servers. It runs faster than on our old servers. Support responds in minutes, not days. Highly recommend!"',
        test_1_name: 'Alexey, Director', test_1_role: 'Trading Company',
        test_2_text: '"We implemented marking through Honest Sign in 2 weeks. Very pleased with the speed and quality. Now all updates are automatic."',
        test_2_name: 'Elena, Chief Accountant', test_2_role: 'Medical Company',
        test_3_text: '"We abandoned our in-house IT department and switched to outsourcing. Savings of over 40% per month. Service quality only improved."',
        test_3_name: 'Mikhail, CEO', test_3_role: 'Logistics Company',
        contact_badge: 'Contact Us', contact_title: 'Leave a Request', contact_subtitle: 'We\'ll call back within 30 minutes and consult on any question',
        contact_phone_label: 'Phone', contact_email_label: 'Email', contact_addr_label: 'Address', contact_addr_value: 'Moscow, ul. Primernaya, d. 1',
        form_name: 'Name', form_phone: 'Phone *', form_email: 'Email', form_company: 'Company', form_service: 'Service', form_message: 'Message',
        form_service_default: 'Select a service', form_service_dev: '1C Customization', form_service_hosting: 'Server Hosting',
        form_service_marking: 'Marking Implementation', form_service_support: '1C Maintenance', form_service_outsource: 'IT Outsourcing', form_service_other: 'Other',
        form_submit: 'Submit Request', form_privacy: 'By clicking "Submit", you agree to the privacy policy',
        footer_desc: 'Full IT support for your business. 1C turnkey.',
        footer_services: 'Services', footer_s1: '1C Customization', footer_s2: 'Server Hosting', footer_s3: 'Marking Implementation', footer_s4: 'IT Outsourcing',
        footer_company: 'Company', footer_c1: 'About Us', footer_c2: 'Reviews', footer_c3: 'Pricing', footer_c4: 'Contacts',
        footer_contacts: 'Contacts', footer_addr: 'Moscow, ul. Primernaya, d. 1', footer_rights: 'All rights reserved.', footer_privacy: 'Privacy Policy',
        auth_title: 'Client Area', auth_subtitle: 'Login or register', auth_login: 'Login', auth_register: 'Register',
        auth_login_btn: 'Login', auth_register_btn: 'Register',
        chat_title: 'Online Chat', chat_subtitle: 'We\'ll reply within a minute', chat_greeting: 'Hello! How can I help?',
    }
};

let currentLang = 'ru';

document.getElementById('langToggle')?.addEventListener('click', () => {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    document.getElementById('langToggle').textContent = currentLang === 'ru' ? 'EN' : 'RU';
    document.documentElement.lang = currentLang;
    applyTranslations();
});

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.textContent = translations[currentLang][key];
        }
    });
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize first carousel slide
    goToSlide(0);
});
