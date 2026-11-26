// Каркас мини-приложения Bilim Ordo.
// Пока только экраны и переходы между ними. Материалов, рейтингов и аккаунтов нет.

const tg = window.Telegram ? window.Telegram.WebApp : null;
if (tg) {
  tg.ready();   // сообщаем Телеграму, что приложение загрузилось
  tg.expand();  // раскрываем на весь экран
}

// Экраны. Адрес экрана хранится после "#": #catalog, #topic, #lesson, #teacher, #teachers, #upload
const screens = {
  catalog: () => `
    <h1>Темы по высшей математике</h1>
    <p class="sub">Выберите тему, чтобы увидеть уроки разных преподавателей.</p>
    <div class="empty">Тем пока нет</div>
  `,

  topic: () => `
    <h1>Тема</h1>
    <p class="sub">Уроки по этой теме от разных преподавателей.</p>
    <div class="empty">Уроков пока нет</div>
  `,

  lesson: () => `
    <h1>Урок</h1>
    <p class="sub">Преподаватель: —</p>
    <div class="video">Здесь будет видео</div>
    <div class="block">
      <h2>Конспект</h2>
      <div class="empty">Здесь будет текст урока</div>
    </div>
  `,

  teachers: () => `
    <h1>Преподаватели</h1>
    <div class="empty">Преподавателей пока нет</div>
  `,

  teacher: () => `
    <h1>Преподаватель</h1>
    <p class="sub">О преподавателе</p>
    <div class="block">
      <h2>Уроки</h2>
      <div class="empty">Уроков пока нет</div>
    </div>
  `,

  upload: () => `
    <h1>Загрузить урок</h1>
    <p class="sub">Для преподавателей. Урок состоит из видео и текста.</p>
    <form id="upload-form">
      <label>Тема
        <select id="f-topic"><option>Тем пока нет</option></select>
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
      <button type="submit">Отправить</button>
      <p class="note" id="f-note">Сохранение уроков появится на следующем шаге.</p>
    </form>
  `,
};

// Какие экраны открываются из нижнего меню, а какие вложенные (на них показываем кнопку «Назад»)
const tabOf = { catalog: 'catalog', topic: 'catalog', lesson: 'catalog',
                teachers: 'teachers', teacher: 'teachers', upload: 'upload' };

function show() {
  const name = location.hash.slice(1) || 'catalog';
  const render = screens[name] || screens.catalog;
  document.getElementById('screen').innerHTML = render();

  const tab = tabOf[name] || 'catalog';
  document.querySelectorAll('.tabs a').forEach(a =>
    a.classList.toggle('active', a.dataset.tab === tab));

  // Кнопка «Назад» Телеграма на вложенных экранах
  if (tg) {
    if (tab !== name) tg.BackButton.show(); else tg.BackButton.hide();
  }

  const form = document.getElementById('upload-form');
  if (form) form.addEventListener('submit', e => e.preventDefault());

  window.scrollTo(0, 0);
}

if (tg) tg.BackButton.onClick(() => history.back());
window.addEventListener('hashchange', show);
show();
