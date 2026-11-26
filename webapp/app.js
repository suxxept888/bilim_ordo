// Мини-приложение Bilim Ordo.
// Сейчас: главная страница с предметами, поиск, страницы предметов и разделов.
// Уроков, рейтингов и аккаунтов пока нет.

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

const screens = {
  teachers: () => `
    <h1>Преподаватели</h1>
    <div class="empty">Преподавателей пока нет</div>
  `,

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
// Адреса: #home, #s-math (предмет), #t-math-0 (раздел), #teachers, #teacher, #lesson, #upload
function show() {
  const hash = location.hash.slice(1) || 'home';
  let html, tab, nested = false;

  const sm = hash.match(/^s-([a-z]+)$/);
  const tm = hash.match(/^t-([a-z]+)-(\d+)$/);

  if (sm && findSubject(sm[1])) {
    html = subjectScreen(findSubject(sm[1])); tab = 'home'; nested = true;
  } else if (tm && findSubject(tm[1]) && findSubject(tm[1]).sections[+tm[2]]) {
    html = sectionScreen(findSubject(tm[1]), +tm[2]); tab = 'home'; nested = true;
  } else if (screens[hash]) {
    html = screens[hash](); tab = hash;
    if (hash === 'teacher') { tab = 'teachers'; nested = true; }
    if (hash === 'lesson') { tab = 'home'; nested = true; }
  } else {
    html = homeScreen(); tab = 'home';
  }

  document.getElementById('screen').innerHTML = html;
  document.querySelectorAll('a[data-tab]').forEach(a =>
    a.classList.toggle('active', a.dataset.tab === tab));

  // Кнопка «Назад» Телеграма на вложенных экранах
  if (tg && tg.BackButton) { nested ? tg.BackButton.show() : tg.BackButton.hide(); }

  bind();
  window.scrollTo(0, 0);
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
  const upload = document.getElementById('upload-form');
  if (upload) upload.addEventListener('submit', e => e.preventDefault());
}

if (tg && tg.BackButton) tg.BackButton.onClick(() => history.back());
window.addEventListener('hashchange', show);
show();
