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
let previewModels = [];
let lastSurprise = null;
let revealObserver = null;
let toastTimer;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
function filteredModels() {
  const query = search.value.trim().toLocaleLowerCase('bg');
  return catalogue.filter(item => (activeCategory === 'Всички' || item.category === activeCategory) && `${item.title} ${item.category} ${item.id}`.toLocaleLowerCase('bg').includes(query));
}
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
    const selection = new Map();
    if (Array.isArray(ids)) ids.forEach(entry => {
      const [id, quantity] = typeof entry === 'string' ? [entry, 1] : Array.isArray(entry) ? entry : [];
      if (catalogueById.has(id) && Number.isInteger(quantity) && quantity >= 1 && quantity <= 999) selection.set(id, quantity);
    });
    return selection;
  } catch { return new Map(); }
}
let selectedModels = new Map();
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
  button.textContent = saved ? `✓ Избрани: ${selectedModels.get(item.id)} бр.` : '+ Запази модела';
}
function createQuantityControl(item, context) {
  const group = document.createElement('div');
  group.className = 'quantity-control';
  group.dataset.model = item.id;
  group.dataset.context = context;
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', `Брой за ${item.title}, ${item.id}`);
  const minus = document.createElement('button');
  minus.type = 'button';
  minus.dataset.action = 'minus';
  minus.textContent = '−';
  minus.setAttribute('aria-label', `Намали броя за ${item.id}`);
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '1';
  input.max = '999';
  input.step = '1';
  input.inputMode = 'numeric';
  input.dataset.action = 'input';
  input.setAttribute('aria-label', `Брой за ${item.id}`);
  const plus = document.createElement('button');
  plus.type = 'button';
  plus.dataset.action = 'plus';
  plus.textContent = '+';
  plus.setAttribute('aria-label', `Увеличи броя за ${item.id}`);
  minus.addEventListener('click', () => changeQuantity(item, selectedModels.get(item.id) - 1, context, 'minus'));
  plus.addEventListener('click', () => changeQuantity(item, selectedModels.get(item.id) + 1, context, 'plus'));
  input.addEventListener('change', () => changeQuantity(item, Number(input.value), context, 'input'));
  input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); input.blur(); } });
  group.append(minus, input, plus);
  return group;
}
function syncQuantityControls(modelId = null) {
  const groups = modelId
    ? document.querySelectorAll(`.quantity-control[data-model="${modelId}"]`)
    : document.querySelectorAll('.quantity-control');
  groups.forEach(group => {
    const count = selectedModels.get(group.dataset.model);
    group.hidden = !count;
    group.querySelector('input').value = count || 1;
    group.querySelector('[data-action=minus]').disabled = !count || count <= 1;
    group.querySelector('[data-action=plus]').disabled = !count || count >= 999;
  });
}
function changeQuantity(item, value, context, action) {
  if (!selectedModels.has(item.id)) return;
  const valid = Number.isInteger(value) && value >= 1 && value <= 999;
  if (valid) selectedModels.set(item.id, value);
  try { localStorage.setItem(selectionStorageKey, JSON.stringify([...selectedModels])); } catch { /* Keep quantities in memory. */ }
  syncSelection(item.id, false);
  const group = document.querySelector(`.quantity-control[data-model="${item.id}"][data-context="${context}"]`);
  const control = group?.querySelector(`[data-action="${action}"]`);
  (control?.disabled ? group.querySelector('input') : control)?.focus({ preventScroll: true });
  document.querySelector('.selection-announcement').textContent = valid ? `${item.id}: ${value} бр.` : 'Въведи цяло число от 1 до 999. Предишният брой е запазен.';
}
function syncSelection(changedModel = null, rebuildList = true) {
  const buttons = changedModel
    ? document.querySelectorAll(`.save-choice[data-model="${changedModel}"]`)
    : document.querySelectorAll('.save-choice[data-model]');
  buttons.forEach(button => setChoiceButton(button, catalogueById.get(button.dataset.model)));
  document.querySelector('#selectionCount').textContent = selectedModels.size;
  document.querySelector('#shortcutCount').textContent = selectedModels.size;
  updateSelectionShortcut();
  document.querySelector('#selectionEmpty').hidden = selectedModels.size > 0;
  document.querySelector('#contactMessage').required = selectedModels.size === 0;
  document.querySelector('#messageRequirement').textContent = selectedModels.size ? '/ по желание' : '*';
  const list = document.querySelector('#selectionList');
  const listScroll = list.scrollTop;
  if (rebuildList) {
    list.replaceChildren();
    [...selectedModels.keys()].forEach((id, index) => {
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
    const controls = document.createElement('div');
    controls.className = 'selection-controls';
    controls.append(createQuantityControl(item, 'selection'), remove);
    row.append(view, controls);
      list.append(row);
    });
    list.scrollTop = listScroll;
  }
  syncQuantityControls(changedModel);
  if (document.querySelector('#enquiryText').value) document.querySelector('#enquiryText').value = buildEnquiry().body;
}
function toggleSelection(item, trigger) {
  if (selectedModels.has(item.id)) selectedModels.delete(item.id);
  else selectedModels.set(item.id, 1);
  try { localStorage.setItem(selectionStorageKey, JSON.stringify([...selectedModels])); } catch { /* Keep the in-memory selection. */ }
  syncSelection();
  const message = `${item.id} ${selectedModels.has(item.id) ? 'е добавен към' : 'е премахнат от'} избраните. Общо: ${selectedModels.size}.`;
  document.querySelector('.selection-announcement').textContent = message;
  const toast = document.querySelector('#selectionToast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2400);
  if (selectedModels.has(item.id) && trigger) celebrateSelection(trigger);
}
previewSave.addEventListener('click', () => { if (previewItem) toggleSelection(previewItem, previewSave); });
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
  const opening = !lightbox.open;
  if (opening) {
    opener = button;
    const filtered = filteredModels();
    previewModels = filtered.some(model => model.id === item.id) ? filtered : catalogue;
    previewScrollY = window.scrollY;
    document.body.style.top = `-${previewScrollY}px`;
    document.body.classList.add('preview-open');
  }
  previewItem = item;
  setChoiceButton(previewSave, item);
  lightbox.querySelector('.quantity-control')?.remove();
  previewSave.after(createQuantityControl(item, 'preview'));
  syncQuantityControls();
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
  document.querySelector('#previewPosition').textContent = `${previewModels.findIndex(model => model.id === item.id) + 1} / ${previewModels.length}`;
  document.querySelector('#previousModel').disabled = previewModels.length < 2;
  document.querySelector('#nextModel').disabled = previewModels.length < 2;
  if (opening) lightbox.showModal();
  lightbox.querySelector('.preview-content').scrollTop = 0;
  if (opening) lightbox.querySelector('.close-preview').focus({ preventScroll: true });
}

function render(append = false) {
  const matches = filteredModels();
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
    img.fetchPriority = 'low';
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
    save.addEventListener('click', () => toggleSelection(item, save));
    card.append(button, save, createQuantityControl(item, 'card'));
    gallery.append(card);
    revealObserver?.observe(card);
  });
  syncQuantityControls();
  document.querySelector('#resultCount').textContent = `${Math.min(limit, matches.length)} от ${matches.length} предложения · ${activeCategory}`;
  document.querySelector('.empty-state').hidden = matches.length > 0;
  loadMore.hidden = limit >= matches.length;
  document.querySelector('#surpriseMe').disabled = matches.length === 0;
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

const contactEmail = 'ydirimanov@gmail.com';
const contactForm = document.querySelector('#contactForm');
function buildEnquiry() {
  const data = new FormData(contactForm);
  const name = data.get('name').trim();
  const email = data.get('email').trim();
  const occasion = data.get('occasion').trim();
  const message = data.get('message').trim();
  const models = [...selectedModels].map(([id, quantity]) => {
    const item = catalogueById.get(id);
    return `${id} — ${item.title} — ${quantity} бр.\nhttps://vonamirid-afk.github.io/Dar-Arts-Crafts/?model=${id}`;
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
  if (contactForm.querySelector('[type="submit"]').disabled) return;
  if (!validateEnquiry()) return;
  const { name, subject, body } = buildEnquiry();
  const status = contactForm.querySelector('.form-status');
  const submitButton = contactForm.querySelector('[type="submit"]');
  const formData = new FormData(contactForm);
  const payload = {
    name,
    email: formData.get('email').trim(),
    _replyto: formData.get('email').trim(),
    _subject: subject,
    _honey: formData.get('_honey') || '',
    _captcha: 'true',
    _next: new URL('thank-you.html', window.location.href).href,
    _autoresponse: 'Здравейте!\n\nБлагодарим Ви, че се свързахте с ДАР! Получихме Вашето запитване и ще го разгледаме с внимание. Ще Ви отговорим на посочения имейл възможно най-скоро, за да обсъдим Вашата идея и детайлите.\n\nТова е автоматично потвърждение за получено запитване.\n\nС най-добри пожелания,\nДАР — малки жестове, големи чувства',
    occasion: formData.get('occasion').trim() || 'Не е посочен',
    message: body
  };
  document.querySelector('#enquiryText').value = body;
  submitButton.disabled = true;
  status.textContent = 'Продължаваме към потвърждение и изпращане…';
  // Auto replies require a standard POST with FormSubmit's CAPTCHA enabled.
  const submission = document.createElement('form');
  submission.method = 'POST';
  submission.action = `https://formsubmit.co/${encodeURIComponent(contactEmail)}`;
  submission.hidden = true;
  for (const [name, value] of Object.entries(payload)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    submission.append(input);
  }
  document.body.append(submission);
  HTMLFormElement.prototype.submit.call(submission);
  submission.remove();
});
window.addEventListener('pageshow', () => {
  contactForm.querySelector('[type="submit"]').disabled = false;
  contactForm.querySelector('.form-status').textContent = '';
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


function navigatePreview(direction) {
  if (!lightbox.open || previewModels.length < 2) return;
  const index = previewModels.findIndex(item => item.id === previewItem.id);
  openPreview(previewModels[(index + direction + previewModels.length) % previewModels.length], opener);
}
document.querySelector('#previousModel').addEventListener('click', () => navigatePreview(-1));
document.querySelector('#nextModel').addEventListener('click', () => navigatePreview(1));
lightbox.addEventListener('keydown', event => {
  if (event.target.closest('input, textarea, select, .quantity-control')) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    navigatePreview(event.key === 'ArrowLeft' ? -1 : 1);
  }
});
let swipeStart = null;
const previewImageArea = lightbox.querySelector('.preview-image');
previewImageArea.addEventListener('touchstart', event => {
  swipeStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
}, { passive: true });
previewImageArea.addEventListener('touchcancel', () => { swipeStart = null; }, { passive: true });
previewImageArea.addEventListener('touchend', event => {
  if (!swipeStart || event.touches.length || !event.changedTouches.length) { swipeStart = null; return; }
  const dx = event.changedTouches[0].clientX - swipeStart.x;
  const dy = event.changedTouches[0].clientY - swipeStart.y;
  swipeStart = null;
  if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) navigatePreview(dx < 0 ? 1 : -1);
}, { passive: true });
document.querySelector('#surpriseMe').addEventListener('click', event => {
  const matches = filteredModels();
  if (!matches.length) return;
  const choices = matches.length > 1 ? matches.filter(item => item.id !== lastSurprise) : matches;
  const item = choices[Math.floor(Math.random() * choices.length)];
  lastSurprise = item.id;
  openPreview(item, event.currentTarget);
});
if ('IntersectionObserver' in window) {
  const animations = new Set();
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      revealObserver.unobserve(entry.target);
      if (reducedMotion.matches || !entry.target.animate) return;
      const animation = entry.target.animate([
        { opacity: .4, translate: '0 16px' },
        { opacity: 1, translate: '0 0' }
      ], { duration: 420, easing: 'ease-out' });
      animations.add(animation);
      animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
    });
  }, { threshold: .12 });
  document.querySelectorAll('.catalogue-card, .pink-paper, .about-copy, .note, .contact-form').forEach(element => revealObserver.observe(element));
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) animations.forEach(animation => animation.cancel());
  });
}


// Small transform-only effects, with bounded particles and no scroll event loop.
const effectAnimations = new Set();
function playEffect(element, frames, options) {
  if (reducedMotion.matches || !element.animate) return null;
  if (document.hidden) return null;
  const animation = element.animate(frames, options);
  effectAnimations.add(animation);
  animation.finished.then(() => effectAnimations.delete(animation), () => effectAnimations.delete(animation));
  return animation;
}
function celebrateSelection(button) {
  if (reducedMotion.matches || document.hidden) return;
  document.querySelectorAll('.paper-burst').forEach(layer => layer.remove());
  const host = button.closest('dialog') || document.body;
  const bounds = button.getBoundingClientRect();
  const offset = host === document.body ? { left: 0, top: 0 } : host.getBoundingClientRect();
  const layer = document.createElement('div');
  layer.className = 'paper-burst';
  layer.setAttribute('aria-hidden', 'true');
  host.append(layer);
  for (let i = 0; i < 12; i++) {
    const piece = document.createElement('i');
    piece.style.left = `${bounds.left + bounds.width / 2 - offset.left}px`;
    piece.style.top = `${bounds.top + Math.min(bounds.height / 2, 22) - offset.top}px`;
    piece.style.background = ['#f46b45', '#f8ced8', '#ffbd38', '#252323'][i % 4];
    piece.style.borderRadius = i % 3 === 0 ? '50%' : '1px';
    layer.append(piece);
    const angle = (i / 12) * Math.PI * 2;
    const distance = 42 + Math.random() * 52;
    playEffect(piece, [
      { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
      { transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance - 28}px) rotate(${i * 37}deg)`, opacity: .9, offset: .65 },
      { transform: `translate(${Math.cos(angle) * distance * 1.15}px, ${Math.sin(angle) * distance + 20}px) rotate(${i * 53}deg)`, opacity: 0 }
    ], { duration: 650, easing: 'ease-out' });
  }
  playEffect(button, [{ scale: '1' }, { scale: '1.035', offset: .4 }, { scale: '1' }], { duration: 250 });
  setTimeout(() => layer.remove(), 750);
}
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const heroArt = document.querySelector('.hero-art');
let tiltTarget = null;
let tiltFrame = 0;
let pointerPosition = null;
function resetTilt() {
  if (tiltFrame) cancelAnimationFrame(tiltFrame);
  tiltFrame = 0;
  tiltTarget?.style.removeProperty('--tilt-x');
  tiltTarget?.style.removeProperty('--tilt-y');
  tiltTarget = null;
  heroArt.style.removeProperty('--collage-x');
  heroArt.style.removeProperty('--collage-y');
}
function queueTilt(event, target, hero = false) {
  if (reducedMotion.matches || !finePointer.matches || event.pointerType !== 'mouse') return;
  pointerPosition = { x: event.clientX, y: event.clientY, target, hero };
  if (tiltFrame) return;
  tiltFrame = requestAnimationFrame(() => {
    tiltFrame = 0;
    const { x, y, target, hero } = pointerPosition;
    const bounds = (hero ? heroArt : target.closest('.piece')).getBoundingClientRect();
    const dx = Math.max(-1, Math.min(1, (x - bounds.left) / bounds.width * 2 - 1));
    const dy = Math.max(-1, Math.min(1, (y - bounds.top) / bounds.height * 2 - 1));
    if (hero) {
      heroArt.style.setProperty('--collage-x', `${dx * 9}px`);
      heroArt.style.setProperty('--collage-y', `${dy * 7}px`);
    } else {
      if (tiltTarget !== target) {
        tiltTarget?.style.removeProperty('--tilt-x');
        tiltTarget?.style.removeProperty('--tilt-y');
      }
      tiltTarget = target;
      target.style.setProperty('--tilt-x', `${-dy * 4}deg`);
      target.style.setProperty('--tilt-y', `${dx * 4}deg`);
    }
  });
}
heroArt.addEventListener('pointermove', event => queueTilt(event, heroArt, true));
heroArt.addEventListener('pointerleave', resetTilt);
gallery.addEventListener('pointermove', event => {
  const frame = event.target.closest('.piece-image');
  if (frame) queueTilt(event, frame);
  else resetTilt();
});
gallery.addEventListener('pointerleave', resetTilt);
finePointer.addEventListener('change', resetTilt);
reducedMotion.addEventListener('change', () => {
  if (!reducedMotion.matches) return;
  resetTilt();
  effectAnimations.forEach(animation => animation.cancel());
  document.querySelectorAll('.paper-burst').forEach(layer => layer.remove());
});
document.addEventListener('visibilitychange', () => {
  document.body.classList.toggle('effects-paused', document.hidden);
  if (document.hidden) {
    resetTilt();
    effectAnimations.forEach(animation => animation.pause());
  } else {
    effectAnimations.forEach(animation => { if (animation.playState === 'paused') animation.play(); });
  }
});
if ('IntersectionObserver' in window) {
  const ambientObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('effect-in-view', entry.isIntersecting));
  });
  document.querySelectorAll('.hero-art, .little-star, .about-sun, .closing-flower').forEach(element => ambientObserver.observe(element));
  const drawingObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      drawingObserver.unobserve(entry.target);
      if (reducedMotion.matches) return;
      entry.target.querySelectorAll('path').forEach(path => {
        const length = path.getTotalLength();
        playEffect(path, [
          { strokeDasharray: `${length}`, strokeDashoffset: `${length}` },
          { strokeDasharray: `${length}`, strokeDashoffset: '0' }
        ], { duration: 1050, easing: 'ease-in-out' });
      });
    });
  }, { threshold: .5 });
  document.querySelectorAll('.scribble, .doodle').forEach(element => drawingObserver.observe(element));
}
