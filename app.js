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
const mediaPath = (item, size) => `media/${item.id}-${size}.webp`;
const sourceSet = (item, sizes = [480, 800, 1280]) => {
  const widths = new Map();
  sizes.forEach(size => widths.set(item.widths[[480, 800, 1280].indexOf(size)], mediaPath(item, size)));
  return [...widths].map(([width, path]) => `${path} ${width}w`).join(', ');
};
const selectionStorageKey = 'dar-selected-models-v1';
const catalogueById = new Map(catalogue.map(item => [item.id, item]));
function readSelection(value) {
  try {
    const ids = JSON.parse(value);
    return new Set(Array.isArray(ids) ? ids.filter(id => catalogueById.has(id)) : []);
  } catch { return new Set(); }
}
let selectedModels = new Set();
try { selectedModels = readSelection(localStorage.getItem(selectionStorageKey)); } catch { /* Selection still works when storage is unavailable. */ }
let previewItem = null;
let selectionFormVisible = false;
function updateSelectionShortcut() {
  document.querySelector('#selectionShortcut').hidden = selectedModels.size === 0 || selectionFormVisible;
}
const previewSave = document.querySelector('#previewSave');
function setChoiceButton(button, item) {
  const saved = selectedModels.has(item.id);
  button.dataset.model = item.id;
  button.setAttribute('aria-pressed', String(saved));
  button.setAttribute('aria-label', `${saved ? 'Премахни от избраните' : 'Добави към избраните'}: ${item.title}, ${item.id}`);
  button.textContent = saved ? '✓ В избраните' : '+ Запази модела';
}
function syncSelection() {
  document.querySelectorAll('.save-choice[data-model]').forEach(button => setChoiceButton(button, catalogueById.get(button.dataset.model)));
  document.querySelector('#selectionCount').textContent = selectedModels.size;
  document.querySelector('#shortcutCount').textContent = selectedModels.size;
  updateSelectionShortcut();
  document.querySelector('#selectionEmpty').hidden = selectedModels.size > 0;
  document.querySelector('#contactMessage').required = selectedModels.size === 0;
  document.querySelector('#messageRequirement').textContent = selectedModels.size ? '/ по желание' : '*';
  const list = document.querySelector('#selectionList');
  list.replaceChildren();
  [...selectedModels].forEach((id, index) => {
    const item = catalogueById.get(id);
    const row = document.createElement('li');
    const view = document.createElement('button');
    view.type = 'button';
    view.className = 'selection-view';
    view.setAttribute('aria-label', `Разгледай ${item.title}, ${id}`);
    const img = document.createElement('img');
    img.src = mediaPath(item, 480);
    img.alt = '';
    img.width = 52;
    img.height = 64;
    img.loading = 'lazy';
    const text = document.createElement('span');
    const title = document.createElement('strong');
    title.textContent = item.title;
    const code = document.createElement('small');
    code.textContent = id;
    text.append(title, code);
    view.append(img, text);
    view.addEventListener('click', () => openPreview(item, view));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-choice';
    remove.textContent = 'Премахни';
    remove.setAttribute('aria-label', `Премахни ${item.title}, ${id}`);
    remove.addEventListener('click', () => {
      toggleSelection(item);
      const remaining = list.querySelectorAll('.remove-choice');
      (remaining[Math.min(index, remaining.length - 1)] || document.querySelector('#selectionTitle')).focus({ preventScroll: true });
    });
    row.append(view, remove);
    list.append(row);
  });
  if (document.querySelector('#enquiryText').value) document.querySelector('#enquiryText').value = buildEnquiry().body;
}
function toggleSelection(item) {
  if (selectedModels.has(item.id)) selectedModels.delete(item.id);
  else selectedModels.add(item.id);
  try { localStorage.setItem(selectionStorageKey, JSON.stringify([...selectedModels])); } catch { /* Keep the in-memory selection. */ }
  syncSelection();
  document.querySelector('.selection-announcement').textContent = `${item.id} ${selectedModels.has(item.id) ? 'е добавен към' : 'е премахнат от'} избраните. Общо: ${selectedModels.size}.`;
}
previewSave.addEventListener('click', () => { if (previewItem) toggleSelection(previewItem); });
window.addEventListener('storage', event => {
  if (event.key === selectionStorageKey || event.key === null) {
    selectedModels = readSelection(event.key === null ? null : event.newValue);
    syncSelection();
  }
});

let previewScrollY = 0;
const previewStatus = lightbox.querySelector('.preview-status');
lightboxImage.addEventListener('load', () => { previewStatus.textContent = ''; });
lightboxImage.addEventListener('error', () => {
  if (lightbox.open) previewStatus.textContent = 'Снимката не се зареди. Затвори прегледа и опитай отново.';
});

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
  previewItem = item;
  setChoiceButton(previewSave, item);
  previewScrollY = window.scrollY;
  document.body.style.top = `-${previewScrollY}px`;
  document.body.classList.add('preview-open');
  previewStatus.textContent = 'Зареждане на снимката…';
  lightboxImage.width = item.width;
  lightboxImage.height = item.height;
  lightboxImage.sizes = '(max-width: 700px) calc(100vw - 20px), 540px';
  lightboxImage.srcset = sourceSet(item);
  lightboxImage.src = mediaPath(item, 800);
  lightboxImage.alt = `${item.title} — ${item.id}`;
  document.querySelector('#previewCategory').textContent = item.category;
  document.querySelector('#previewTitle').textContent = item.title;
  document.querySelector('#previewDescription').textContent = 'Ръчно изработен модел с личен характер. Разгледай снимката отблизо, за да откриеш цветовете, материалите и малките детайли.';
  lightbox.querySelector('.preview-id').textContent = `Модел ${item.id}`;
  lightbox.showModal();
  lightbox.querySelector('.preview-content').scrollTop = 0;
  lightbox.querySelector('button').focus({ preventScroll: true });
}

function render(append = false) {
  const query = search.value.trim().toLocaleLowerCase('bg');
  const matches = catalogue.filter(item => (activeCategory === 'Всички' || item.category === activeCategory) && `${item.title} ${item.category} ${item.id}`.toLocaleLowerCase('bg').includes(query));
  filters.querySelectorAll('button').forEach(button => {
    const selected = button.dataset.category === activeCategory;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  const start = append ? gallery.children.length : 0;
  if (!append) gallery.replaceChildren();
  matches.slice(start, limit).forEach(item => {
    const card = document.createElement('article');
    card.className = 'catalogue-card';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'piece';
    button.setAttribute('aria-label', `Разгледай: ${item.title}, ${item.id}`);
    const frame = document.createElement('span');
    frame.className = 'piece-image';
    const img = document.createElement('img');
    img.width = item.width;
    img.height = item.height;
    img.sizes = '(max-width: 700px) calc((100vw - 55px) / 2), (max-width: 1000px) calc((100vw - 124px) / 3), 360px';
    img.srcset = sourceSet(item);
    img.src = mediaPath(item, 480);
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
    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'save-choice';
    setChoiceButton(save, item);
    save.addEventListener('click', () => toggleSelection(item));
    card.append(button, save);
    gallery.append(card);
  });
  document.querySelector('#resultCount').textContent = `${Math.min(limit, matches.length)} от ${matches.length} предложения · ${activeCategory}`;
  document.querySelector('.empty-state').hidden = matches.length > 0;
  loadMore.hidden = limit >= matches.length;
}
search.addEventListener('input', () => { limit = 6; render(); });
loadMore.addEventListener('click', () => {
  const previousCount = gallery.children.length;
  limit += 6;
  render(true);
  gallery.children[previousCount]?.querySelector('.piece').focus({ preventScroll: true });
});
lightbox.querySelector('.close-preview').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', event => {
  const bounds = lightbox.getBoundingClientRect();
  if (event.target === lightbox && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) lightbox.close();
});
lightbox.addEventListener('close', () => {
  lightboxImage.removeAttribute('srcset');
  lightboxImage.removeAttribute('src');
  previewStatus.textContent = '';
  document.body.classList.remove('preview-open');
  document.body.style.removeProperty('top');
  window.scrollTo({ top: previewScrollY, behavior: 'instant' });
  (opener?.isConnected ? opener : document.querySelector('#selectionTitle')).focus({ preventScroll: true });
});
render();

// Replace this reserved example address with the real inbox before publishing.
const contactEmail = 'hello@dar.example';
const contactForm = document.querySelector('#contactForm');
function buildEnquiry() {
  const data = new FormData(contactForm);
  const name = data.get('name').trim();
  const email = data.get('email').trim();
  const occasion = data.get('occasion').trim();
  const message = data.get('message').trim();
  const models = [...selectedModels].map(id => {
    const item = catalogueById.get(id);
    return `${id} — ${item.title}\nhttps://vonamirid-afk.github.io/Dar-Arts-Crafts/?model=${id}`;
  });
  const subject = `Запитване за ДАР${occasion ? ` — ${occasion}` : ''}`;
  const body = `${message || 'Здравейте! Бих искал/а да науча повече за избраните модели.'}${models.length ? `\n\nИзбрани модели (${models.length}):\n${models.join('\n\n')}` : ''}\n\nПовод: ${occasion || 'Не е посочен'}\nОт: ${name}\nИмейл за отговор: ${email}`;
  return { name, message, subject, body };
}
function validateEnquiry() {
  if (!contactForm.reportValidity()) return false;
  const { name, message } = buildEnquiry();
  if (!name || (!message && !selectedModels.size)) {
    contactForm.querySelector('.form-status').textContent = 'Добави име и избери модел или напиши няколко думи за твоята идея.';
    document.querySelector(!name ? '#contactName' : '#contactMessage').focus();
    return false;
  }
  return true;
}
contactForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!validateEnquiry()) return;
  const { subject, body } = buildEnquiry();
  document.querySelector('#enquiryText').value = body;
  window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  contactForm.querySelector('.form-status').textContent = 'Запитването с избраните модели е подготвено за твоето приложение за имейл. Ако не се отвори, използвай „Копирай запитването“. Съобщението още не е изпратено.';
});
document.querySelector('#copyEnquiry').addEventListener('click', async () => {
  if (!validateEnquiry()) return;
  const text = document.querySelector('#enquiryText');
  text.value = buildEnquiry().body;
  try {
    await navigator.clipboard.writeText(text.value);
    document.querySelector('#copyStatus').textContent = 'Текстът е копиран. Постави го в ново писмо.';
  } catch {
    text.focus();
    text.select();
    document.querySelector('#copyStatus').textContent = 'Маркирахме текста. Копирай го и го постави в ново писмо.';
  }
});
contactForm.addEventListener('input', () => {
  if (document.querySelector('#enquiryText').value) document.querySelector('#enquiryText').value = buildEnquiry().body;
});
syncSelection();
if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => {
    selectionFormVisible = entries[0].isIntersecting;
    updateSelectionShortcut();
  }).observe(contactForm);
}
const linkedModel = catalogueById.get(new URLSearchParams(window.location.search).get('model'));
if (linkedModel) openPreview(linkedModel, document.querySelector('#selectionTitle'));
