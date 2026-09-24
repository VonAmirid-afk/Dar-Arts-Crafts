const menuButton = document.querySelector('.menu-button');
const mobileNav = document.querySelector('#mobileNav');
function setMenu(open) {
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Затвори менюто' : 'Отвори менюто');
  mobileNav.hidden = !open;
}
menuButton.addEventListener('click', () => setMenu(mobileNav.hidden));
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
window.addEventListener('resize', () => { if (window.innerWidth > 700) setMenu(false); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !mobileNav.hidden) { setMenu(false); menuButton.focus(); }
});

const gallery = document.querySelector('#gallery');
const filters = document.querySelector('.filters');
const search = document.querySelector('#catalogueSearch');
const loadMore = document.querySelector('#loadMore');
const lightbox = document.querySelector('#lightbox');
const lightboxImage = lightbox.querySelector('img');
let activeCategory = 'Всички';
let limit = 6;
let opener;
const categories = ['Всички', ...new Set(catalogue.map(item => item.category))];
const imagePath = (folder, path) => folder + '/' + path.split('/').map(encodeURIComponent).join('/');

categories.forEach(category => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'filter';
  button.dataset.category = category;
  button.append(document.createTextNode(category));
  const count = document.createElement('span');
  count.textContent = category === 'Всички' ? catalogue.length : catalogue.filter(item => item.category === category).length;
  button.append(count);
  button.addEventListener('click', () => { activeCategory = category; limit = 6; render(); });
  filters.append(button);
});

function openPreview(item, button) {
  opener = button;
  lightboxImage.src = imagePath('images', item.path);
  lightboxImage.alt = `${item.title} — ${item.id}`;
  document.querySelector('#previewCategory').textContent = item.category;
  document.querySelector('#previewTitle').textContent = item.title;
  document.querySelector('#previewDescription').textContent = 'Ръчно изработен модел с личен характер. Разгледай снимката отблизо, за да откриеш цветовете, материалите и малките детайли.';
  lightbox.querySelector('.preview-id').textContent = `Модел ${item.id}`;
  lightbox.showModal();
  lightbox.querySelector('button').focus();
}

function render() {
  const query = search.value.trim().toLocaleLowerCase('bg');
  const matches = catalogue.filter(item => (activeCategory === 'Всички' || item.category === activeCategory) && `${item.title} ${item.category} ${item.id}`.toLocaleLowerCase('bg').includes(query));
  filters.querySelectorAll('button').forEach(button => {
    const selected = button.dataset.category === activeCategory;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  gallery.replaceChildren();
  matches.slice(0, limit).forEach(item => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'piece';
    button.setAttribute('aria-label', `Разгледай: ${item.title}, ${item.id}`);
    const frame = document.createElement('span');
    frame.className = 'piece-image';
    const img = document.createElement('img');
    img.src = imagePath('thumbs', item.path);
    img.alt = item.title;
    img.loading = 'lazy';
    img.decoding = 'async';
    const zoom = document.createElement('span');
    zoom.className = 'piece-zoom';
    zoom.textContent = '↗';
    zoom.setAttribute('aria-hidden', 'true');
    frame.append(img, zoom);
    const meta = document.createElement('span');
    meta.className = 'piece-meta';
    const category = document.createElement('span');
    category.textContent = item.category;
    const id = document.createElement('span');
    id.textContent = item.id;
    meta.append(category, id);
    const title = document.createElement('span');
    title.className = 'piece-title';
    title.textContent = item.title;
    const subtitle = document.createElement('span');
    subtitle.className = 'piece-subtitle';
    subtitle.textContent = 'Виж детайлите ↗';
    button.append(frame, meta, title, subtitle);
    button.addEventListener('click', () => openPreview(item, button));
    gallery.append(button);
  });
  document.querySelector('#resultCount').textContent = `${Math.min(limit, matches.length)} от ${matches.length} предложения · ${activeCategory}`;
  document.querySelector('.empty-state').hidden = matches.length > 0;
  loadMore.hidden = limit >= matches.length;
}
search.addEventListener('input', () => { limit = 6; render(); });
loadMore.addEventListener('click', () => {
  const previousCount = gallery.children.length;
  limit += 6;
  render();
  gallery.children[previousCount]?.focus({ preventScroll: true });
});
lightbox.querySelector('.close-preview').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', event => {
  const bounds = lightbox.getBoundingClientRect();
  if (event.target === lightbox && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) lightbox.close();
});
lightbox.addEventListener('close', () => { lightboxImage.removeAttribute('src'); opener?.focus({ preventScroll: true }); });
render();

// Replace this reserved example address with the real inbox before publishing.
const contactEmail = 'hello@dar.example';
const contactForm = document.querySelector('#contactForm');
contactForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!contactForm.reportValidity()) return;
  const data = new FormData(contactForm);
  const name = data.get('name').trim();
  const email = data.get('email').trim();
  const occasion = data.get('occasion').trim();
  const message = data.get('message').trim();
  if (!name || !message) {
    contactForm.querySelector('.form-status').textContent = 'Добави име и няколко думи за твоята идея.';
    document.querySelector(!name ? '#contactName' : '#contactMessage').focus();
    return;
  }
  const subject = `Запитване за ДАР${occasion ? ` — ${occasion}` : ''}`;
  const body = `${message}\n\nПовод или модел: ${occasion || 'Не е посочен'}\nОт: ${name}\nИмейл за отговор: ${email}`;
  window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  contactForm.querySelector('.form-status').textContent = 'Писмото е подготвено за твоето приложение за имейл. Ако не се отвори, провери дали имаш настроено такова. Съобщението още не е изпратено.';
});
