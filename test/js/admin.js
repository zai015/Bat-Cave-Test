const API_URL = '../php/booking_handler.php';
const MENU_API_URL = '../php/menu_handler.php';

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    document.getElementById('menuModal').style.display = 'none';

    // Set Current Date
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('en-US', dateOptions);
    }

    // Initialize Dashboard
    initDashboard();

    fetchBookings();
    fetchMenu();

    // Logout Button
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Simple tab switching
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });

    // Menu Form Submit
    document.getElementById('menuForm').addEventListener('submit', saveMenuItem);
});

function initDashboard() {
    // Check if chart elements exist before initializing
    const salesCanvas = document.getElementById('salesChart');
    const categoryCanvas = document.getElementById('categoryChart');

    if (salesCanvas && categoryCanvas) {
        // Sales Chart
        const ctxSales = salesCanvas.getContext('2d');
        new Chart(ctxSales, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Weekly Sales (₱)',
                    data: [12000, 15000, 11000, 18000, 22000, 25000, 15400], // Manual Data
                    borderColor: '#14b89c',
                    backgroundColor: 'rgba(20, 184, 156, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#a0a0a0' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#a0a0a0' }
                    }
                }
            }
        });

        // Category Chart
        const ctxCategory = categoryCanvas.getContext('2d');
        new Chart(ctxCategory, {
            type: 'doughnut',
            data: {
                labels: ['Coffee', 'Pastries', 'Snacks', 'Equipment'],
                datasets: [{
                    data: [45, 25, 20, 10], // Manual Data
                    backgroundColor: [
                        '#14b89c', // Primary
                        '#f57c00', // Orange
                        '#1976d2', // Blue
                        '#c2185b'  // Pink
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#a0a0a0' }
                    }
                }
            }
        });
    }
}

function checkAuth() {
    const isAuth = localStorage.getItem('batCaveAdminAuth');
    if (!isAuth) {
        window.location.href = 'login.html';
    }
}

function logout() {
    localStorage.removeItem('batCaveAdminAuth');
    localStorage.removeItem('batCaveAdminUser');
    window.location.href = 'login.html';
}

// --- Bookings Logic ---
async function fetchBookings() {
    try {
        const response = await fetch(API_URL);
        const bookings = await response.json();
        renderTable(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
    }
}

function renderTable(bookings) {
    const tbody = document.getElementById('reservationTable');
    tbody.innerHTML = '';

    if (bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No bookings found.</td></tr>';
        return;
    }

    // Sort by date (newest first)
    bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    bookings.forEach(b => {
        const tr = document.createElement('tr');

        let statusColor = '#a0a0a0';
        if (b.status === 'confirmed') statusColor = '#4caf50';
        if (b.status === 'rejected') statusColor = '#f44336';
        if (b.status === 'pending') statusColor = '#ff9800';

        tr.innerHTML = `
            <td>${b.id.substring(3, 9)}...</td>
            <td>
                <strong>${b.contact.name}</strong><br>
                <small>${b.contact.phone}</small>
            </td>
            <td>${b.date}</td>
            <td>${b.startTime} - ${b.endTime}</td>
            <td>${b.mode} ${b.mode === 'Study' ? `(${b.pax})` : ''}</td>
            <td><span style="color:${statusColor}; font-weight:600; text-transform:uppercase;">${b.status}</span></td>
            <td>
                ${b.status === 'pending' ? `
                    <button class="action-btn btn-approve" onclick="updateStatus('${b.id}', 'approve')">Approve</button>
                    <button class="action-btn btn-reject" onclick="updateStatus('${b.id}', 'reject')">Reject</button>
                ` : ''}
                <button class="action-btn btn-reject" onclick="updateStatus('${b.id}', 'delete')" style="background:rgba(255,0,0,0.1); color:red;">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function updateStatus(id, action) {
    if (!confirm(`Are you sure you want to ${action} this booking?`)) return;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action })
        });

        if (response.ok) {
            fetchBookings(); // Refresh table
        } else {
            alert('Failed to update booking.');
        }
    } catch (error) {
        console.error('Error updating booking:', error);
    }
}

// --- Menu Logic ---
let menuItems = [];

async function fetchMenu() {
    try {
        const response = await fetch(MENU_API_URL);
        menuItems = await response.json();
        renderMenuTable(menuItems);
    } catch (error) {
        console.error('Error fetching menu:', error);
    }
}

function renderMenuTable(items) {
    const tbody = document.getElementById('menuTable');
    tbody.innerHTML = '';

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No menu items found.</td></tr>';
        return;
    }

    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${item.image}" alt="${item.name}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;"></td>
            <td>${item.name} ${item.isSignature ? '<span style="color:#d4af37; font-size:0.8em;">★</span>' : ''}</td>
            <td style="text-transform:capitalize;">${item.category}</td>
            <td>₱${item.price}</td>
            <td>${item.isPopular ? 'Yes' : 'No'}</td>
            <td>
                <button class="action-btn btn-approve" onclick="editMenuItem('${item.id}')">Edit</button>
                <button class="action-btn btn-reject" onclick="deleteMenuItem('${item.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openMenuModal(itemId = null) {
    const modal = document.getElementById('menuModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('menuForm');
    const currentImageText = document.getElementById('currentImageText');

    modal.style.display = 'block';

    if (itemId) {
        const item = menuItems.find(i => i.id === itemId);
        title.textContent = 'Edit Menu Item';
        document.getElementById('itemId').value = item.id;
        document.getElementById('itemName').value = item.name;
        document.getElementById('itemPrice').value = item.price;
        document.getElementById('itemCategory').value = item.category;
        document.getElementById('itemImage').value = item.image; // Hidden input
        document.getElementById('itemSub').value = item.subDescription || '';
        document.getElementById('itemDesc').value = item.description || '';
        document.getElementById('itemPopular').checked = item.isPopular;
        document.getElementById('itemSignature').checked = item.isSignature;

        currentImageText.textContent = `Current: ${item.image}`;
    } else {
        title.textContent = 'Add Menu Item';
        form.reset();
        document.getElementById('itemId').value = '';
        document.getElementById('itemImage').value = '';
        currentImageText.textContent = '';
    }
}

function closeMenuModal() {
    document.getElementById('menuModal').style.display = 'none';
}

window.onclick = function (event) {
    const modal = document.getElementById('menuModal');
    if (event.target == modal) {
        closeMenuModal();
    }
}

function editMenuItem(id) {
    openMenuModal(id);
}

async function saveMenuItem(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('id', document.getElementById('itemId').value);
    formData.append('name', document.getElementById('itemName').value);
    formData.append('price', document.getElementById('itemPrice').value);
    formData.append('category', document.getElementById('itemCategory').value);
    formData.append('subDescription', document.getElementById('itemSub').value);
    formData.append('description', document.getElementById('itemDesc').value);
    formData.append('isPopular', document.getElementById('itemPopular').checked ? '1' : '0');
    formData.append('isSignature', document.getElementById('itemSignature').checked ? '1' : '0');

    // Handle Image
    const fileInput = document.getElementById('itemImageFile');
    if (fileInput.files.length > 0) {
        formData.append('imageFile', fileInput.files[0]);
    } else {
        // If no new file, send the existing path
        formData.append('image', document.getElementById('itemImage').value);
    }

    try {
        const response = await fetch(MENU_API_URL, {
            method: 'POST',
            body: formData // No Content-Type header needed, browser sets it for FormData
        });

        if (response.ok) {
            closeMenuModal();
            fetchMenu();
        } else {
            const result = await response.json();
            alert(result.error || 'Failed to save item.');
        }
    } catch (error) {
        console.error('Error saving item:', error);
    }
}

async function deleteMenuItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
        const response = await fetch(MENU_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', id: id })
        });

        if (response.ok) {
            fetchMenu();
        } else {
            const result = await response.json();
            alert(result.error || 'Failed to delete item.');
        }
    } catch (error) {
        console.error('Error deleting item:', error);
    }
}
