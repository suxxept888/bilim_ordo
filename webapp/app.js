// Мини-приложение Bilim Ordo.
// Сейчас: главная с предметами и поиском, страницы предметов и разделов,
// вход по логину и паролю, режимы гостя, ученика и преподавателя.
// Настоящих аккаунтов с сервером, уроков, рейтингов и ИИ пока нет.

const tg = window.Telegram ? window.Telegram.WebApp : null;
if (tg) {
  tg.ready();   // сообщаем Телеграму, что приложение загрузилось
  tg.expand();  // раскрываем на весь экран
  // Фирменные цвета вместо цветов темы Телеграма
  try { tg.setHeaderColor('#0A2463'); } catch (e) {}
  try { tg.setBackgroundColor('#FFFFFF'); } catch (e) {}
  try { tg.setBottomBarColor('#0A2463'); } catch (e) {}
}

let query = ''; // текст в строке поиска

// ---------- Кто открыл приложение ----------
// В Телеграме имя берём из Телеграма, в обычном браузере — тестовый ученик.
const inTelegram = !!(tg && tg.initData);
const tgUser = inTelegram && tg.initDataUnsafe ? tg.initDataUnsafe.user : null;

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
  } catch (e) { return null; }
}

// ---------- Вход (демо) ----------
// ВНИМАНИЕ: это демо-замок без сервера. Код сайта открыт, поэтому настоящей защиты здесь нет.
// Пароли хранятся только в виде отпечатка SHA-256 (строка «bilim_ordo:логин:пароль»).
// Настоящие аккаунты появятся вместе с сервером и базой данных.
const ACCOUNTS = {
  suxxept: '9aaef6c6abf387449d8bdc9601b8ba39e1dc5818a0819714bba4823c536dd631',
};

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkLogin(login, password) {
  login = login.trim().toLowerCase();
  if (!ACCOUNTS[login]) return false;
  return (await sha256(`bilim_ordo:${login}:${password}`)) === ACCOUNTS[login];
}

// Кто вошёл (логин) и в какой роли. Хранится в памяти браузера на этом устройстве.
let account = store('bo_account');
let role = account && ['student', 'teacher'].includes(store('bo_role')) ? store('bo_role') : 'guest';

// Имя: из Телеграма, если открыто там; иначе — логин
function currentUser() {
  return {
    firstName: (tgUser && tgUser.first_name) || account || 'Гость',
    lastName: (tgUser && tgUser.last_name) || '',
    username: tgUser ? tgUser.username : null,
  };
}

// Пункты меню для каждого режима
const MENUS = {
  guest: [
    { tab: 'home', label: 'Главная', icon: 'home' },
    { tab: 'login', label: 'Войти', icon: 'login', desktopOnly: true },
    { tab: 'signup', label: 'Создать аккаунт', icon: 'userPlus', cta: true },
  ],
  student: [
    { tab: 'home', label: 'Главная', icon: 'home' },
    { tab: 'my', label: 'Мои уроки', icon: 'book' },
    { tab: 'plan', label: 'Мой план', icon: 'plan' },
    { tab: 'saved', label: 'Избранное', icon: 'star' },
    { tab: 'profile', label: 'Профиль', icon: 'user', mobileOnly: true },
  ],
  teacher: [
    { tab: 'home', label: 'Главная', icon: 'home' },
    { tab: 'tmy', label: 'Мои уроки', icon: 'book' },
    { tab: 'upload', label: 'Загрузить урок', icon: 'upload' },
    { tab: 'profile', label: 'Профиль', icon: 'user', mobileOnly: true },
  ],
};

const MENU_ICONS = {
  home: '<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/>',
  login: '<path d="M14 4h5v16h-5"/><path d="M3 12h11M10 8l4 4-4 4"/>',
  userPlus: '<circle cx="10" cy="8" r="4"/><path d="M3 20c1-4 4-6 7-6s4 1 5 2"/><path d="M19 14v6M16 17h6"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/>',
  plan: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/><path d="m9 15 2 2 4-4"/>',
  star: '<path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4l-5.5 2.9 1-6.2L3 9.7l6.2-.9z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>',
};

function menuIcon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${MENU_ICONS[name]}</svg>`;
}

// Рисует меню в шапке (компьютер), кнопку справа и нижнее меню (телефон)
function renderMenus() {
  const items = MENUS[role];
  document.getElementById('top-nav').innerHTML = items
    .filter(i => !i.mobileOnly)
    .map(i => `<a href="#${i.tab}" data-tab="${i.tab}"${i.cta ? ' class="cta"' : ''}>${i.label}</a>`).join('');

  document.getElementById('top-right').innerHTML = role !== 'guest'
    ? `<a class="avatar-link" href="#profile" data-tab="profile" title="Профиль"><span class="avatar">${esc(currentUser().firstName[0].toUpperCase())}</span></a>`
    : `<a class="top-login" href="#login" data-tab="login">Войти</a>`;

  const tabs = items.filter(i => !i.desktopOnly);
  const nav = document.getElementById('tabs');
  nav.className = 'tabs tabs-' + tabs.length;
  nav.innerHTML = tabs
    .map(i => `<a href="#${i.tab}" data-tab="${i.tab}">${menuIcon(i.icon)}<span>${i.label}</span></a>`).join('');
}

function setRole(next) {
  role = next;
  store('bo_role', next === 'guest' ? null : next);
  renderMenus();
}

function logout() {
  account = null;
  store('bo_account', null);
  setRole('guest');
}

// ---------- Помощники ----------
function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function icon(subject) {
  return `<svg viewBox="0 0 24 24" stroke="${subject.iconColor || subject.color}" aria-hidden="true">${ICONS[subject.icon]}</svg>`;
}

// «4 раздела», «5 разделов», «1 преподаватель» и т.д.
function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} ${one}`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return `${n} ${few}`;
  return `${n} ${many}`;
}

function findSubject(id) { return SUBJECTS.find(s => s.id === id); }

// ---------- Экраны ----------
function homeScreen() {
  return `
    <section class="hero">
      <h1>Уроки от реальных преподавателей</h1>
      <form class="search" id="search-form" role="search">
        <input id="search" type="search" placeholder="Предмет или тема" value="${esc(query)}" autocomplete="off">
        <button type="submit">Найти</button>
      </form>
    </section>

    <h2>Предметы</h2>
    <div class="subjects" id="subjects">${subjectCards()}</div>
  `;
}

function subjectCards() {
  const q = query.trim().toLowerCase();
  const list = SUBJECTS.filter(s => !q ||
    s.name.toLowerCase().includes(q) ||
    s.sections.some(sec => sec.toLowerCase().includes(q)));

  if (list.length === 0) {
    return `<div class="empty" style="grid-column: 1 / -1">По запросу «${esc(query)}» ничего не нашлось</div>`;
  }

  return list.map(s => `
    <a class="card" href="#s-${s.id}" style="background:${s.color};color:${s.text}">
      <span class="icon">${icon(s)}</span>
      <strong>${esc(s.name)}</strong>
      <span class="meta">${plural(s.sections.length, 'раздел', 'раздела', 'разделов')}<br>0 преподавателей</span>
    </a>
  `).join('');
}

function subjectScreen(s) {
  return `
    <section class="subject-hero" style="--band:${s.color};background:${s.color};color:${s.text}">
      <span class="icon">${icon(s)}</span>
      <div>
        <h1>${esc(s.name)}</h1>
        <p>${plural(s.sections.length, 'раздел', 'раздела', 'разделов')} · 0 преподавателей</p>
      </div>
    </section>
    <div class="list">
      ${s.sections.map((sec, i) => `
        <a class="row" href="#t-${s.id}-${i}">
          <span class="dot" style="background:${s.color}"></span>
          <span class="txt"><strong>${esc(sec)}</strong><span>Уроков пока нет</span></span>
          <span class="arrow">›</span>
        </a>
      `).join('')}
    </div>
  `;
}

function sectionScreen(s, i) {
  return `
    <p class="sub" style="margin-top:18px"><a href="#s-${s.id}" style="color:inherit">${esc(s.name)}</a></p>
    <h1 style="margin-top:0">${esc(s.sections[i])}</h1>
    <p class="sub">Уроки по этой теме от разных преподавателей.</p>
    <div class="empty">Уроков пока нет</div>
  `;
}

// ---------- Вход, выбор роли, регистрация ----------
function loginScreen() {
  return `
    <h1>Вход</h1>
    <p class="sub">Войдите, чтобы смотреть уроки целиком и ставить оценки.</p>
    <form id="login-form" class="login" autocomplete="on">
      <label>Логин
        <input id="l-login" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required>
      </label>
      <label>Пароль
        <input id="l-pass" type="password" autocomplete="current-password" required>
      </label>
      <p class="error" id="l-error" hidden>Неверный логин или пароль</p>
      <button class="primary" type="submit">Войти</button>
    </form>
    <p class="note">Нет аккаунта? <a href="#signup">Создать аккаунт</a></p>
  `;
}

function chooseScreen() {
  return `
    <h1>Как войти?</h1>
    <p class="sub">Вы вошли как <strong>${esc(account)}</strong>. Выберите роль, её можно сменить в профиле.</p>
    <div class="roles">
      <button class="role" type="button" data-role="student">
        <strong>Как ученик</strong>
        <span>Смотреть уроки, составлять план учёбы, ставить оценки</span>
        <em>Войти →</em>
      </button>
      <button class="role" type="button" data-role="teacher">
        <strong>Как преподаватель</strong>
        <span>Публиковать уроки и привлекать учеников</span>
        <em>Войти →</em>
      </button>
    </div>
  `;
}

function signupScreen() {
  return `
    <h1>Создать аккаунт</h1>
    <p class="sub">Регистрация скоро появится. Она заработает вместе с базой данных.</p>
    <div class="empty">Уже есть аккаунт? <a href="#login">Войти</a></div>
  `;
}

// ---------- Экраны ученика ----------
const PLAN_GOALS = ['Сессия в вузе', 'ОРТ', 'Школьная программа', 'Для себя'];
const PLAN_LEVELS = ['Начинаю с нуля', 'Знаю основы', 'Знаю хорошо, нужно повторить'];

function option(list, selected) {
  return list.map(v => `<option${v === selected ? ' selected' : ''}>${esc(v)}</option>`).join('');
}

const studentScreens = {
  my: () => `
    <h1>Мои уроки</h1>
    <p class="sub">Здесь будут уроки, которые вы начали или прошли.</p>
    <div class="empty">Вы ещё не начали ни одного урока.<br><a href="#home">Выбрать предмет</a></div>
  `,

  plan: () => {
    let saved = {};
    try { saved = JSON.parse(store('bo_plan') || '{}'); } catch (e) {}
    return `
      <h1>Мой план</h1>
      <p class="sub">Ответьте на несколько вопросов, и ИИ-помощник составит план учёбы по неделям со ссылками на уроки.</p>
      <form id="plan-form" class="plan">
        <label>Что вы готовите?
          <select id="p-goal">${option(PLAN_GOALS, saved.goal)}</select>
        </label>
        <label>Предмет
          <select id="p-subject">${option(SUBJECTS.map(s => s.name), saved.subject)}</select>
        </label>
        <label>Ваш уровень сейчас
          <select id="p-level">${option(PLAN_LEVELS, saved.level)}</select>
        </label>
        <label>К какому числу нужно успеть?
          <input id="p-date" type="date" value="${esc(saved.date || '')}">
        </label>
        <label>Сколько часов в неделю готовы заниматься?
          <input id="p-hours" type="number" min="1" max="60" placeholder="Например, 6" value="${esc(saved.hours || '')}">
        </label>
        <button class="primary" type="submit">Составить план</button>
        <div class="notice" id="plan-note" ${saved.goal ? '' : 'hidden'}>
          Ответы сохранены. ИИ-помощник подключим на следующем шаге, и здесь появится ваш план.
        </div>
      </form>
    `;
  },

  saved: () => `
    <h1>Избранное</h1>
    <p class="sub">Сохраняйте уроки и преподавателей, чтобы быстро к ним вернуться.</p>
    <div class="empty">Здесь пока пусто</div>
  `,

};

// Профиль: общий для ученика и преподавателя
function profileScreen() {
  const u = currentUser();
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
  const other = role === 'student' ? 'teacher' : 'student';
  return `
    <h1>Профиль</h1>
    <div class="profile">
      <span class="avatar avatar-lg">${esc(u.firstName[0].toUpperCase())}</span>
      <div class="who">
        <strong>${esc(name)}</strong>
        <span>Логин: ${esc(account)}${u.username ? ` · @${esc(u.username)}` : ''}</span>
        <span class="badge">${role === 'student' ? 'Ученик' : 'Преподаватель'}</span>
      </div>
    </div>
    ${role === 'student'
      ? '<h2>Мои оценки</h2><div class="empty">Вы ещё не оценили ни одного урока</div>'
      : '<h2>Мой рейтинг</h2><div class="empty">Рейтинг появится, когда ученики оценят ваши уроки</div>'}
    <div class="actions">
      <button class="secondary" type="button" data-role="${other}">Сменить роль: ${other === 'student' ? 'ученик' : 'преподаватель'}</button>
      <button class="secondary" type="button" id="logout">Выйти</button>
    </div>
  `;
}

const screens = {

  teacher: () => `
    <h1>Преподаватель</h1>
    <p class="sub">О преподавателе</p>
    <h2>Уроки</h2>
    <div class="empty">Уроков пока нет</div>
  `,

  lesson: () => `
    <h1>Урок</h1>
    <p class="sub">Преподаватель: —</p>
    <div class="video">Здесь будет видео</div>
    <h2>Конспект</h2>
    <div class="empty">Здесь будет текст урока</div>
  `,

};

// ---------- Экраны преподавателя ----------
const teacherScreens = {
  tmy: () => `
    <h1>Мои уроки</h1>
    <p class="sub">Уроки, которые вы опубликовали. Здесь будут их просмотры и оценки учеников.</p>
    <div class="empty">Вы ещё не опубликовали ни одного урока.<br><a href="#upload">Загрузить первый урок</a></div>
  `,

  upload: () => `
    <h1>Загрузить урок</h1>
    <p class="sub">Для преподавателей. Урок состоит из видео и текста.</p>
    <form id="upload-form">
      <label>Предмет
        <select id="f-subject">${SUBJECTS.map(s => `<option>${esc(s.name)}</option>`).join('')}</select>
      </label>
      <label>Название урока
        <input id="f-title" type="text">
      </label>
      <label>Ссылка на видео
        <input id="f-video" type="url" placeholder="https://">
      </label>
      <label>Текст урока
        <textarea id="f-text"></textarea>
      </label>
      <button class="primary" type="submit">Отправить</button>
      <p class="note">Сохранение уроков появится на следующем шаге.</p>
    </form>
  `,
};

// ---------- Переходы между экранами ----------
// Адреса: #home, #s-math (предмет), #t-math-0 (раздел), #login, #signup, #teacher, #lesson,
// ученик: #my, #plan, #saved, #profile; преподаватель: #tmy, #upload, #profile
let backTo = null; // куда ведёт кнопка «Назад» с текущего экрана (null — на главной)

function show() {
  const hash = location.hash.slice(1) || 'home';
  let html, tab;
  backTo = null;

  const sm = hash.match(/^s-([a-z]+)$/);
  const tm = hash.match(/^t-([a-z]+)-(\d+)$/);

  if (sm && findSubject(sm[1])) {
    html = subjectScreen(findSubject(sm[1])); tab = 'home'; backTo = 'home';
  } else if (tm && findSubject(tm[1]) && findSubject(tm[1]).sections[+tm[2]]) {
    html = sectionScreen(findSubject(tm[1]), +tm[2]); tab = 'home'; backTo = 's-' + tm[1];
  } else if (hash === 'login' || hash === 'signup') {
    if (role !== 'guest') { location.replace('#home'); return; }   // уже вошли
    html = !account ? (hash === 'login' ? loginScreen() : signupScreen()) : chooseScreen();
    tab = hash; backTo = 'home';
  } else if (hash === 'profile' && role !== 'guest') {
    html = profileScreen(); tab = 'profile';
  } else if (role === 'student' && studentScreens[hash]) {
    html = studentScreens[hash](); tab = hash;
  } else if (role === 'teacher' && teacherScreens[hash]) {
    html = teacherScreens[hash](); tab = hash;
  } else if (studentScreens[hash] || teacherScreens[hash] || hash === 'profile') {
    location.replace(role === 'guest' ? '#login' : '#home'); return; // раздел другой роли или нужен вход
  } else if (screens[hash]) {
    html = screens[hash](); tab = hash; backTo = 'home';
    if (hash === 'teacher' || hash === 'lesson') tab = 'home';
  } else {
    html = homeScreen(); tab = 'home';
  }

  document.getElementById('screen').innerHTML = html;
  document.querySelectorAll('a[data-tab]').forEach(a =>
    a.classList.toggle('active', a.dataset.tab === tab));

  // Кнопка «←» возле названия и кнопка «Назад» Телеграма: видны везде, кроме главной
  document.getElementById('back').hidden = !backTo;
  if (tg && tg.BackButton) { backTo ? tg.BackButton.show() : tg.BackButton.hide(); }

  bind();
  window.scrollTo(0, 0);
}

// Возврат на экран уровнем выше: раздел → предмет → главная
function goBack() {
  if (backTo) location.hash = backTo;
}

function bind() {
  const input = document.getElementById('search');
  if (input) {
    input.addEventListener('input', () => {
      query = input.value;
      document.getElementById('subjects').innerHTML = subjectCards();
    });
    document.getElementById('search-form').addEventListener('submit', e => {
      e.preventDefault();
      input.blur(); // прячем клавиатуру
    });
  }
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const login = document.getElementById('l-login').value;
    const ok = await checkLogin(login, document.getElementById('l-pass').value);
    if (!ok) {
      document.getElementById('l-error').hidden = false;
      document.getElementById('l-pass').value = '';
      return;
    }
    account = login.trim().toLowerCase();
    store('bo_account', account);
    show(); // покажет выбор роли
  });

  // Кнопки выбора и смены роли
  document.querySelectorAll('[data-role]').forEach(btn =>
    btn.addEventListener('click', () => {
      setRole(btn.dataset.role);
      location.hash = 'home';
      show();
    }));

  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) logoutBtn.addEventListener('click', () => {
    logout();
    location.hash = 'home';
    show();
  });

  const plan = document.getElementById('plan-form');
  if (plan) plan.addEventListener('submit', e => {
    e.preventDefault();
    const answers = {
      goal: document.getElementById('p-goal').value,
      subject: document.getElementById('p-subject').value,
      level: document.getElementById('p-level').value,
      date: document.getElementById('p-date').value,
      hours: document.getElementById('p-hours').value,
    };
    store('bo_plan', JSON.stringify(answers));
    document.getElementById('plan-note').hidden = false;
  });

  const upload = document.getElementById('upload-form');
  if (upload) upload.addEventListener('submit', e => e.preventDefault());
}

document.getElementById('back').addEventListener('click', goBack);
if (tg && tg.BackButton) tg.BackButton.onClick(goBack);
window.addEventListener('hashchange', show);
renderMenus();
show();
