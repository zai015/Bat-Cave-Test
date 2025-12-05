const API_URL = '../php/booking_handler.php';
const MENU_API_URL = '../php/menu_handler.php';
const GALLERY_API_URL = '../php/gallery_handler.php';

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
    fetchGallery();

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

    // Gallery Form Submit
    // Gallery Form Submit
    document.getElementById('galleryForm').addEventListener('submit', saveGalleryItem);

    // Review Form Submit
    document.getElementById('reviewForm').addEventListener('submit', saveReview);
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
// --- Bookings Logic ---
let allBookings = [];
let currentPage = 1;
let rowsPerPage = 5;

async function fetchBookings() {
    try {
        const response = await fetch(API_URL);
        allBookings = await response.json();

        // Update Pending Count KPI
        const pendingCount = allBookings.filter(b => b.status === 'pending').length;
        const pendingEl = document.getElementById('pendingCount');
        if (pendingEl) {
            pendingEl.textContent = pendingCount;
        }

        // Sort by date (newest first)
        allBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Restore rows per page preference
        const savedRows = localStorage.getItem('adminRowsPerPage');
        if (savedRows) {
            if (savedRows === 'all') {
                rowsPerPage = allBookings.length;
            } else {
                rowsPerPage = parseInt(savedRows);
            }
        }

        renderTable();
        setupPagination();
    } catch (error) {
        console.error('Error fetching bookings:', error);
    }
}

function setupPagination() {
    const rowsSelect = document.getElementById('rowsPerPage');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    if (rowsSelect) {
        // Sync dropdown with current state
        const savedRows = localStorage.getItem('adminRowsPerPage');
        if (savedRows) {
            rowsSelect.value = savedRows;
        }

        rowsSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            localStorage.setItem('adminRowsPerPage', val);

            if (val === 'all') {
                rowsPerPage = allBookings.length;
            } else {
                rowsPerPage = parseInt(val);
            }
            currentPage = 1;
            renderTable();
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(allBookings.length / rowsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
            }
        });
    }
}

function renderTable() {
    const tbody = document.getElementById('reservationTable');
    tbody.innerHTML = '';

    if (allBookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No bookings found.</td></tr>';
        updatePaginationControls();
        return;
    }

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedItems = allBookings.slice(start, end);

    paginatedItems.forEach(b => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer'; // Make row look clickable
        tr.onclick = (e) => {
            // Prevent opening request if clicking an action button
            if (e.target.closest('button')) return;
            openViewModal(b);
        };

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
            <td>${formatDateReadable(b.date)}</td>
            <td>${formatTime12(b.startTime)} - ${formatTime12(b.endTime)}</td>
            <td>${b.mode} ${b.mode === 'Study' ? `(${b.pax})` : ''}</td>
            <td>
                <span style="color:${statusColor}; font-weight:600; text-transform:uppercase;">${b.status}</span>
                ${b.review_note ? `<div style="font-size:0.8em; color:#a0a0a0; margin-top:4px; max-width:150px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="Note: ${b.review_note}"><i style="margin-right:3px;">Note: </i>${b.review_note}</div>` : ''}
            </td>
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

    updatePaginationControls();
}

function updatePaginationControls() {
    const totalPages = Math.ceil(allBookings.length / rowsPerPage) || 1;
    const pageIndicator = document.getElementById('pageIndicator');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    if (pageIndicator) pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
}

async function updateStatus(id, action) {
    if (action === 'delete') {
        if (!confirm(`Are you sure you want to delete this booking?`)) return;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action })
            });

            if (response.ok) {
                fetchBookings(); // Refresh table
            } else {
                alert('Failed to delete booking.');
            }
        } catch (error) {
            console.error('Error deleting booking:', error);
        }
        return;
    }

    // For Approve/Reject, use the modal
    openReviewModal(id, action);
}

function openReviewModal(id, action) {
    const modal = document.getElementById('reviewModal');
    const title = document.getElementById('reviewTitle');
    const submitBtn = document.getElementById('reviewSubmitBtn');
    const warning = document.getElementById('rejectionWarning');
    const noteLabel = document.getElementById('reviewNoteLabel');

    document.getElementById('reviewId').value = id;
    document.getElementById('reviewAction').value = action;
    document.getElementById('reviewNote').value = ''; // Reset note

    if (action === 'reject') {
        title.textContent = 'Reject Booking';
        submitBtn.textContent = 'Confirm Rejection';
        submitBtn.style.background = '#f44336';
        submitBtn.style.color = '#fff';
        warning.style.display = 'block';
        noteLabel.innerHTML = 'Reason for Rejection <span style="color:red">*</span>';
        document.getElementById('reviewNote').required = true;
    } else {
        title.textContent = 'Approve Booking';
        submitBtn.textContent = 'Confirm Approval';
        submitBtn.style.background = '#4caf50';
        submitBtn.style.color = '#fff';
        warning.style.display = 'none';
        noteLabel.textContent = 'Note (Optional)';
        document.getElementById('reviewNote').required = false;
    }

    modal.style.display = 'block';
}

function closeReviewModal() {
    document.getElementById('reviewModal').style.display = 'none';
}

async function saveReview(e) {
    e.preventDefault();

    const id = document.getElementById('reviewId').value;
    const action = document.getElementById('reviewAction').value;
    const note = document.getElementById('reviewNote').value;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action, note }) // Send note to backend
        });

        if (response.ok) {
            closeReviewModal();
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

function openViewModal(booking) {
    const modal = document.getElementById('viewBookingModal');
    const details = document.getElementById('viewBookingDetails');

    const statusColor = booking.status === 'confirmed' ? '#4caf50' :
        booking.status === 'rejected' ? '#f44336' :
            booking.status === 'pending' ? '#ff9800' : '#a0a0a0';

    // Format Date and Time
    const formattedDate = formatDateReadable(booking.date);
    const formattedStartTime = formatTime12(booking.startTime);
    const formattedEndTime = formatTime12(booking.endTime);

    details.innerHTML = `
        <div style="display:grid; grid-template-columns: 100px 1fr; gap:10px; margin-bottom:15px; overflow-wrap: anywhere;">
            <div style="color:var(--text-secondary);">Booking ID:</div>
            <div>${booking.id}</div>
            
            <div style="color:var(--text-secondary);">Status:</div>
            <div style="color:${statusColor}; font-weight:bold; text-transform:uppercase;">${booking.status}</div>
            ${booking.review_note ? `
                <div style="color:var(--text-secondary);">Note:</div>
                <div style="color:#f44336;">${booking.review_note}</div>
            ` : ''}

            <div style="color:var(--text-secondary);">Date:</div>
            <div>${formattedDate}</div>

            <div style="color:var(--text-secondary);">Time:</div>
            <div>${formattedStartTime} - ${formattedEndTime} (${booking.duration} hrs)</div>

            <div style="color:var(--text-secondary);">Mode:</div>
            <div>${booking.mode} ${booking.mode === 'Study' ? `(${booking.pax} Pax)` : ''}</div>

            <div style="color:var(--text-secondary);">Add-ons:</div>
            <div>${booking.addOns && booking.addOns.length > 0 ? booking.addOns.join(', ') : 'None'}</div>

            <div style="color:var(--text-secondary);">Cost:</div>
            <div style="font-weight:bold; color:var(--accent-primary);">₱${booking.cost}</div>
        </div>
        
        <div style="border-top:1px solid var(--border-light); padding-top:15px; margin-bottom:15px;">
            <h4 style="margin-bottom:10px;">Contact Information</h4>
            <div style="display:grid; grid-template-columns: 100px 1fr; gap:10px; overflow-wrap: anywhere;">
                <div style="color:var(--text-secondary);">Name:</div>
                <div>${booking.contact.name}</div>
                
                <div style="color:var(--text-secondary);">Phone:</div>
                <div>${booking.contact.phone}</div>
                
                <div style="color:var(--text-secondary);">Email:</div>
                <div>${booking.contact.email}</div>
            </div>
        </div>

        ${booking.status === 'pending' ? `
            <div style="border-top:1px solid var(--border-light); padding-top:15px; display:flex; gap:10px; justify-content:flex-end;">
                <button class="action-btn btn-approve" style="padding:8px 16px;" onclick="handleViewAction('${booking.id}', 'approve')">Approve</button>
                <button class="action-btn btn-reject" style="padding:8px 16px;" onclick="handleViewAction('${booking.id}', 'reject')">Reject</button>
            </div>
        ` : ''}
    `;

    modal.style.display = 'block';
}

function handleViewAction(id, action) {
    closeViewModal();
    updateStatus(id, action);
}

// Helper Functions
function formatDateReadable(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function formatTime12(time24) {
    if (!time24) return '';
    let [hour, minute] = time24.split(':');
    hour = parseInt(hour);
    const amPm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${amPm}`;
}

function closeViewModal() {
    document.getElementById('viewBookingModal').style.display = 'none';
}

function closeReviewModal() {
    document.getElementById('reviewModal').style.display = 'none';
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

// --- Gallery Logic ---
let galleryItems = [];

async function fetchGallery() {
    try {
        const response = await fetch(GALLERY_API_URL);
        galleryItems = await response.json();
        renderGalleryGrid(galleryItems);
    } catch (error) {
        console.error('Error fetching gallery:', error);
    }
}

function renderGalleryGrid(items) {
    const container = document.getElementById('galleryGrid');
    container.innerHTML = '';

    // Ensure we render 8 slots, using data if available, else placeholder
    for (let i = 1; i <= 8; i++) {
        const item = items.find(g => g.id === i) || { id: i, image: '', caption: '' };

        const card = document.createElement('div');
        card.className = 'kpi-card'; // Reuse card style or define specific
        card.style.flexDirection = 'column';
        card.style.alignItems = 'flex-start';
        card.style.gap = '10px';

        card.innerHTML = `
            <div style="width:100%; height:150px; background:#2a2a2a; border-radius:8px; overflow:hidden; position:relative;">
                ${item.image ? `<img src="${item.image}" style="width:100%; height:100%; object-fit:cover;">` : '<span style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:#555;">No Image</span>'}
            </div>
            <div>
                <h4 style="margin:0;">Slot ${i}</h4>
                <p style="margin:0; font-size:0.9em; color:#a0a0a0;">${item.caption || 'No caption'}</p>
            </div>
            <button class="action-btn btn-approve" style="width:100%;" onclick="openGalleryModal(${i})">Edit Slot</button>
        `;
        container.appendChild(card);
    }
}

function openGalleryModal(id) {
    const modal = document.getElementById('galleryModal');
    const item = galleryItems.find(g => g.id === id) || { id: id, image: '', caption: '' };

    document.getElementById('galleryId').value = item.id;
    document.getElementById('galleryPreview').src = item.image || '';
    document.getElementById('galleryCaption').value = item.caption || '';
    document.getElementById('galleryImageFile').value = ''; // Reset file input

    // Hide preview if no image
    document.getElementById('galleryPreview').style.display = item.image ? 'block' : 'none';

    modal.style.display = 'block';
}

function closeGalleryModal() {
    document.getElementById('galleryModal').style.display = 'none';
}

async function saveGalleryItem(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('id', document.getElementById('galleryId').value);
    formData.append('caption', document.getElementById('galleryCaption').value);

    // Handle Image
    const fileInput = document.getElementById('galleryImageFile');
    if (fileInput.files.length > 0) {
        formData.append('imageFile', fileInput.files[0]);
    } else {
        // Pass existing image path if needed, though backend uses file mostly
        // If we want to support clearing image, we might need more logic, but here assume edit means replace or keep
        const id = parseInt(document.getElementById('galleryId').value);
        const item = galleryItems.find(g => g.id === id);
        if (item && item.image) {
            formData.append('image', item.image);
        }
    }

    try {
        const response = await fetch(GALLERY_API_URL, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            closeGalleryModal();
            fetchGallery();
        } else {
            const result = await response.json();
            alert(result.error || 'Failed to save gallery item.');
        }
    } catch (error) {
        console.error('Error gallery item:', error);
    }
}

window.onclick = function (event) {
    const galleryModal = document.getElementById('galleryModal');
    const menuModal = document.getElementById('menuModal');
    const reviewModal = document.getElementById('reviewModal');
    const viewBookingModal = document.getElementById('viewBookingModal');
    if (event.target == galleryModal) closeGalleryModal();
    if (event.target == menuModal) closeMenuModal();
    if (event.target == reviewModal) closeReviewModal();
    if (event.target == viewBookingModal) closeViewModal();
}
