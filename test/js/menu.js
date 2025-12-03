const MENU_API_URL = '../php/menu_handler.php';
let allMenuItems = [];

document.addEventListener('DOMContentLoaded', () => {
  fetchMenu();

  // Filter Logic
  const filters = document.querySelectorAll('.filter');
  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all
      filters.forEach(f => {
        f.classList.remove('active');
        f.setAttribute('aria-pressed', 'false');
      });
      // Add active to clicked
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');

      const category = btn.dataset.cat;
      renderMenu(category);
    });
  });
});

async function fetchMenu() {
  try {
    const response = await fetch(MENU_API_URL);
    allMenuItems = await response.json();
    renderMenu('all');
  } catch (error) {
    console.error('Error fetching menu:', error);
    document.getElementById('menu').innerHTML = '<p style="text-align:center; width:100%;">Failed to load menu items.</p>';
  }
}

function renderMenu(category) {
  const container = document.getElementById('menu');
  container.innerHTML = '';

  const filteredItems = category === 'all'
    ? allMenuItems
    : allMenuItems.filter(item => item.category === category);

  if (filteredItems.length === 0) {
    container.innerHTML = '<p style="text-align:center; width:100%; padding: 2rem;">No items found in this category.</p>';
    return;
  }

  filteredItems.forEach(item => {
    const article = document.createElement('article');
    article.className = 'menu-card';
    article.dataset.category = item.category;

    article.innerHTML = `
            <figure class="card-media">
                <img src="${item.image}" alt="${item.name}">
            </figure>
            <div class="card-body">
                <div class="card-head">
                    <h2 class="item-title">${item.name} ${item.isSignature ? '<span class="muted">(Signature)</span>' : ''}</h2>
                    <div class="price">₱${item.price} ${item.category === 'equipment' ? '/ hr' : ''}</div>
                </div>
                <h4 class="item-sub">${item.subDescription || ''}</h4>
                <p class="item-desc">${item.description || ''}</p>
            </div>
        `;
    container.appendChild(article);
  });
}
