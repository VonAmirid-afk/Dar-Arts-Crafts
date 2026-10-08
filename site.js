const menuButton = document.querySelector('.menu-button');
const mobileNav = document.querySelector('#mobileNav');
function setMenu(open) {
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Затвори менюто' : 'Отвори менюто');
  mobileNav.hidden = !open;
}
menuButton.addEventListener('click', () => setMenu(mobileNav.hidden));
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
window.addEventListener('resize', () => { if (window.innerWidth > 900) setMenu(false); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !mobileNav.hidden) { setMenu(false); menuButton.focus(); }
});
