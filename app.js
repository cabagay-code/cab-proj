const STORAGE_KEY = 'foundly.listings.v1';
const validTypes = ['lost', 'found'];
let listings = loadListings();
let activeFilter = 'all';

const listingGrid = document.getElementById('listing-grid');
const searchInput = document.getElementById('search');
const sortInput = document.getElementById('sort');

function loadListings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.location === 'string' && typeof item.contact === 'string' && typeof item.date === 'string' && typeof item.category === 'string' && typeof item.details === 'string' && validTypes.includes(item.type) && typeof item.createdAt === 'number' && typeof item.resolved === 'boolean');
  } catch {
    return [];
  }
}

function saveListings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
  } catch {
    // Keep listings available for this session if browser storage is unavailable.
  }
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function makeCard(item) {
  const card = makeElement('article', 'listing-card');
  const top = makeElement('div', 'listing-top');
  const badge = makeElement('span', `type-badge ${item.resolved ? 'resolved' : item.type}`, item.resolved ? 'Reunited' : item.type);
  const category = makeElement('span', 'category-label', item.category);
  top.append(badge, category);
  const title = makeElement('h3', '', item.name);
  const details = makeElement('p', 'listing-details', item.details || 'No extra details shared yet.');
  const meta = makeElement('div', 'listing-meta');
  const location = makeElement('span', '', `⌖  ${item.location}`);
  const date = makeElement('span', '', `◷  ${formatDate(item.date)}`);
  meta.append(location, date);
  const contact = makeElement('a', 'contact-link', 'Contact the poster ↗');
  contact.href = `mailto:${item.contact}?subject=${encodeURIComponent(`Foundly: ${item.name}`)}`;
  const actions = makeElement('div', 'card-actions');
  if (!item.resolved) {
    const resolve = makeElement('button', 'resolve-button', 'Mark as reunited ✓');
    resolve.type = 'button';
    resolve.addEventListener('click', () => {
      item.resolved = true;
      saveListings();
      render();
    });
    actions.append(resolve);
  } else {
    actions.append(makeElement('span', 'category-label', 'Thanks for helping!'));
  }
  const remove = makeElement('button', 'remove-button', 'Remove');
  remove.type = 'button';
  remove.setAttribute('aria-label', `Remove listing for ${item.name}`);
  remove.addEventListener('click', () => {
    listings = listings.filter(listing => listing.id !== item.id);
    saveListings();
    render();
  });
  actions.append(remove);
  card.append(top, title, details, meta, contact, actions);
  return card;
}

function renderFeatured() {
  const featuredGrid = document.getElementById('featured-grid');
  const featuredItems = listings
    .filter(item => !item.resolved)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3);

  featuredGrid.replaceChildren();
  if (featuredItems.length === 0) {
    const empty = makeElement('div', 'featured-empty');
    empty.append(
      makeElement('span', 'featured-empty-icon', '✳'),
      makeElement('strong', '', 'Your community spotlight starts here.'),
      makeElement('p', '', 'Post a lost or found item and it could be featured here.')
    );
    featuredGrid.append(empty);
    return;
  }

  featuredItems.forEach(item => {
    const card = makeElement('article', `featured-card ${item.type}`);
    const visual = makeElement('div', 'featured-visual');
    visual.setAttribute('aria-hidden', 'true');
    visual.append(
      makeElement('span', 'featured-symbol', item.type === 'lost' ? '⌕' : '✳'),
      makeElement('span', 'featured-ribbon', item.type === 'lost' ? 'LOST ITEM' : 'FOUND ITEM')
    );

    const content = makeElement('div', 'featured-content');
    const category = makeElement('span', 'featured-category', item.category);
    const title = makeElement('h3', '', item.name);
    const location = makeElement('p', 'featured-location', `⌖  ${item.location}`);
    const action = makeElement('button', 'featured-action', 'View listing ↗');
    action.type = 'button';
    action.addEventListener('click', () => {
      activeFilter = item.type;
      searchInput.value = item.name;
      document.querySelectorAll('.filter-tab').forEach(tab => {
        const isActive = tab.dataset.filter === activeFilter;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-pressed', String(isActive));
      });
      render();
      document.getElementById('listings').scrollIntoView({ behavior: 'smooth' });
    });

    content.append(category, title, location, action);
    card.append(visual, content);
    featuredGrid.append(card);
  });
}

function render() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const activeCount = listings.filter(item => !item.resolved).length;
  const resolvedCount = listings.filter(item => item.resolved).length;
  document.getElementById('active-count').textContent = activeCount;
  document.getElementById('resolved-count').textContent = resolvedCount;
  document.getElementById('all-tab-count').textContent = listings.length;
  renderFeatured();

  let shown = listings.filter(item => {
    const matchesFilter = activeFilter === 'all' || (activeFilter === 'resolved' ? item.resolved : !item.resolved && item.type === activeFilter);
    const searchable = `${item.name} ${item.location} ${item.category} ${item.details}`.toLocaleLowerCase();
    return matchesFilter && searchable.includes(query);
  });
  shown.sort((a, b) => sortInput.value === 'oldest' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt);

  listingGrid.replaceChildren();
  shown.forEach(item => listingGrid.append(makeCard(item)));
  const empty = shown.length === 0;
  const emptyState = document.getElementById('empty-state');
  emptyState.hidden = !empty;
  if (listings.length === 0) {
    document.getElementById('empty-title').textContent = 'A clear sky on the board.';
    document.getElementById('empty-copy').textContent = 'No listings yet. Post the first one and help a neighbor out.';
  } else {
    document.getElementById('empty-title').textContent = 'No matches this time.';
    document.getElementById('empty-copy').textContent = 'Try another filter or search with different words.';
  }
}

document.querySelectorAll('.filter-tab').forEach(button => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll('.filter-tab').forEach(tab => {
      const isActive = tab === button;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-pressed', String(isActive));
    });
    render();
  });
});

searchInput.addEventListener('input', render);
sortInput.addEventListener('change', render);

document.getElementById('listing-form').addEventListener('submit', event => {
  event.preventDefault();
  const date = document.getElementById('date').value;
  const contact = document.getElementById('contact').value.trim();
  const name = document.getElementById('item-name').value.trim();
  const location = document.getElementById('location').value.trim();
  if (!name || !location || !contact || !date) return;

  listings.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: document.getElementById('type').value,
    name,
    category: document.getElementById('category').value,
    location,
    date,
    contact,
    details: document.getElementById('details').value.trim(),
    resolved: false,
    createdAt: Date.now()
  });
  saveListings();
  event.target.reset();
  document.getElementById('date').value = new Date().toISOString().slice(0, 10);
  activeFilter = 'all';
  document.querySelectorAll('.filter-tab').forEach(tab => {
    const isActive = tab.dataset.filter === 'all';
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-pressed', String(isActive));
  });
  render();
  document.getElementById('search').value = '';
  document.getElementById('item-name').focus();
  document.getElementById('listings').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('year').textContent = new Date().getFullYear();
document.getElementById('date').value = new Date().toISOString().slice(0, 10);
render();
