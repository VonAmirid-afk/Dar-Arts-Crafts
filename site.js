// Keep decorative marks independent of platform fonts and emoji rendering.
function createArrowIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'arrow-icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', 'M5 19 19 5M5 5h14v14');
  svg.append(path);
  return svg;
}

document.querySelectorAll('span[aria-hidden="true"]').forEach(mark => {
  if (mark.textContent === '↗') mark.replaceChildren(createArrowIcon());
  if (mark.textContent === '✳') {
    const star = createArrowIcon();
    star.setAttribute('class', 'star-icon');
    star.setAttribute('viewBox', '0 0 100 100');
    star.setAttribute('fill', 'none');
    star.firstChild.setAttribute('d', 'M50 6v88M6 50h88M19 19l62 62M19 81l62-62');
    star.firstChild.setAttribute('stroke', 'currentColor');
    star.firstChild.setAttribute('stroke-width', '8');
    mark.replaceChildren(star);
  }
});

// Older editorial links contain the arrow directly in their text node.
document.querySelectorAll('a.text-link').forEach(link => {
  const text = link.lastChild;
  if (text?.nodeType === Node.TEXT_NODE && text.textContent.endsWith('↗')) {
    text.textContent = text.textContent.slice(0, -1);
    link.append(createArrowIcon());
  }
});

const menuButton = document.querySelector('.menu-button');
const mobileNav = document.querySelector('#mobileNav');
function setMenu(open) {
  if (!menuButton || !mobileNav) return;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Затвори менюто' : 'Отвори менюто');
  mobileNav.hidden = !open;
}
menuButton?.addEventListener('click', () => setMenu(mobileNav.hidden));
mobileNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
window.addEventListener('resize', () => { if (window.innerWidth > 900) setMenu(false); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && mobileNav && !mobileNav.hidden) { setMenu(false); menuButton.focus(); }
});
