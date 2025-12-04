const API_URL = '../php/booking_handler.php';

let currentStep = 'step-initial-phone';
let selectedDate = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let bookings = [];
let userPhone = '';

// --- NAVIGATION ---

function showStep(stepId) {
    document.querySelectorAll('.wizard-step').forEach(el => el.style.display = 'none');
    document.getElementById(stepId).style.display = 'block';
    currentStep = stepId;
}

function showCalendar() {
    showStep('step-calendar');
    fetchBookingsAndRenderCalendar();
}



function resetToHome() {
    showStep('step-initial-phone');
    document.getElementById('bookingForm').reset();
    selectedDate = null;
}

// --- CALENDAR LOGIC ---

async function fetchBookingsAndRenderCalendar() {
    try {
        const response = await fetch(API_URL);
        bookings = await response.json();
        renderCalendar(currentMonth, currentYear);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        alert('Failed to load availability.');
    }
}

function renderCalendar(month, year) {
    const grid = document.getElementById('calendarGrid');
    const monthDisplay = document.getElementById('currentMonthYear');
    grid.innerHTML = '';

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    monthDisplay.textContent = `${monthNames[month]} ${year}`;

    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        grid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        cell.textContent = day;

        // Check availability
        const dayBookings = bookings.filter(b => b.date === dateStr && b.status !== 'cancelled' && b.status !== 'rejected');
        const isEvent = dayBookings.some(b => b.mode === 'Event');

        let statusClass = 'green';
        let isClickable = true;

        if (isEvent) {
            statusClass = 'red';
            isClickable = false; // Event blocks the whole day
        } else if (dayBookings.length > 0) {
            statusClass = 'yellow';
        }

        const dot = document.createElement('span');
        dot.className = `dot ${statusClass}`;
        cell.appendChild(dot);

        // Disable past dates
        const cellDate = new Date(year, month, day);
        if (cellDate < new Date().setHours(0, 0, 0, 0)) {
            cell.classList.add('disabled');
        } else if (!isClickable) {
            cell.classList.add('disabled');
            cell.title = "Fully Booked / Event";
        } else {
            cell.onclick = () => selectDate(dateStr, cell);
        }

        grid.appendChild(cell);
    }
}

document.getElementById('prevMonth').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar(currentMonth, currentYear);
});

document.getElementById('nextMonth').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar(currentMonth, currentYear);
});

function selectDate(dateStr, cellElement) {
    document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('selected'));
    cellElement.classList.add('selected');
    selectedDate = dateStr;

    // Proceed to booking details
    document.getElementById('selectedDateDisplay').textContent = selectedDate;
    showStep('step-booking-details');
}

// --- BOOKING FORM LOGIC ---

const bookingForm = document.getElementById('bookingForm');
const startHourInput = document.getElementById('startHour');
const startAmPmInput = document.getElementById('startAmPm');
const endHourInput = document.getElementById('endHour');
const endAmPmInput = document.getElementById('endAmPm');
const bookingModeInput = document.getElementById('bookingMode');
const paxInput = document.getElementById('pax');

// Helper to get 24-hour format "HH:00"
function get24HourTime(hourStr, amPm) {
    if (!hourStr) return null;
    let hour = parseInt(hourStr);
    // Standard 12-hour to 24-hour conversion
    if (amPm === 'PM' && hour < 12) hour += 12;
    if (amPm === 'AM' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:00`;
}

function normalizeHour(hour) {
    // Normalize hours to 13-25 range for easier comparison (1PM to 1AM next day)
    if (hour < 13) return hour + 24;
    return hour;
}

function checkAvailability(date, startStr, endStr) {
    if (!date || !startStr || !endStr) return 20;

    let startH = parseInt(startStr.split(':')[0]);
    let endH = parseInt(endStr.split(':')[0]);

    startH = normalizeHour(startH);
    endH = normalizeHour(endH);

    // Filter bookings for the same date
    const dayBookings = bookings.filter(b => b.date === date && b.status !== 'cancelled' && b.status !== 'rejected');

    let maxOccupancy = 0;

    // Check each hour in the requested range
    for (let h = startH; h < endH; h++) {
        let currentOccupancy = 0;

        for (const b of dayBookings) {
            let bStart = parseInt(b.startTime.split(':')[0]);
            let bEnd = parseInt(b.endTime.split(':')[0]);

            bStart = normalizeHour(bStart);
            bEnd = normalizeHour(bEnd);

            // Check overlap: if the hour 'h' is within the booking's range [bStart, bEnd)
            if (h >= bStart && h < bEnd) {
                if (b.mode === 'Event') {
                    return 0; // Event blocks everything
                }
                currentOccupancy += parseInt(b.pax || 0);
            }
        }
        if (currentOccupancy > maxOccupancy) {
            maxOccupancy = currentOccupancy;
        }
    }

    return Math.max(0, 20 - maxOccupancy);
}

// Auto-calculate duration and cost
[startHourInput, startAmPmInput, bookingModeInput, paxInput, document.getElementById('projector'), document.getElementById('speaker')].forEach(el => {
    el.addEventListener('change', calculateCost);
});

// Special handler for End Hour to auto-set AM/PM
endHourInput.addEventListener('change', () => {
    const h = parseInt(endHourInput.value);
    if (h === 12 || h === 1) {
        endAmPmInput.value = 'AM';
    } else {
        endAmPmInput.value = 'PM';
    }
    calculateCost();
});

// Special handler for Start Hour to auto-set AM/PM
startHourInput.addEventListener('change', () => {
    const h = parseInt(startHourInput.value);
    if (h === 12) {
        startAmPmInput.value = 'AM';
    } else {
        startAmPmInput.value = 'PM';
    }
    calculateCost();
});

function calculateCost() {
    const start = get24HourTime(startHourInput.value, startAmPmInput.value);
    const end = get24HourTime(endHourInput.value, endAmPmInput.value);
    const mode = bookingModeInput.value;
    const requestedPax = parseInt(paxInput.value) || 1;

    // Toggle Pax input visibility
    if (mode === 'Event') {
        document.getElementById('paxGroup').style.display = 'none';
    } else {
        document.getElementById('paxGroup').style.display = 'block';
    }

    // Check Availability
    const availablePax = checkAvailability(selectedDate, start, end);

    // Update UI for availability
    const availDisplay = document.getElementById('availabilityDisplay');
    if (availDisplay) {
        availDisplay.textContent = `(Available: ${availablePax})`;
        availDisplay.style.color = availablePax > 0 ? 'green' : 'red';
    }

    // Update Pax Input Max
    if (mode === 'Study') {
        paxInput.max = availablePax;
        if (requestedPax > availablePax) {
            paxInput.value = availablePax; // Auto-adjust down
        }
    }

    // Block if Event requested but not full room available
    if (mode === 'Event' && availablePax < 20) {
        document.getElementById('totalCost').textContent = "Unavailable (Room not empty)";
        document.getElementById('durationDisplay').textContent = "-";
        return; // Stop calculation
    }

    if (availablePax === 0) {
        document.getElementById('totalCost').textContent = "Unavailable";
        document.getElementById('durationDisplay').textContent = "-";
        return;
    }

    if (start && end) {
        // Handle 00:00 and 01:00 as next day for calculation
        let startHour = parseInt(start.split(':')[0]);
        let endHour = parseInt(end.split(':')[0]);

        startHour = normalizeHour(startHour);
        endHour = normalizeHour(endHour);

        let diff = endHour - startHour;

        if (diff <= 0) {
            document.getElementById('durationDisplay').textContent = "Invalid";
            document.getElementById('totalCost').textContent = "0";
            return;
        }

        document.getElementById('durationDisplay').textContent = diff.toFixed(1);

        let cost = 0;
        if (mode === 'Study') {
            cost = 50 * diff * (parseInt(paxInput.value) || 1);
        } else {
            cost = 1000 * diff;
        }

        // Add-ons
        if (document.getElementById('projector').checked) cost += 150 * diff;
        if (document.getElementById('speaker').checked) cost += 150 * diff;

        document.getElementById('totalCost').textContent = cost.toFixed(2);
    }
}

bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const start = get24HourTime(startHourInput.value, startAmPmInput.value);
    const end = get24HourTime(endHourInput.value, endAmPmInput.value);
    const mode = bookingModeInput.value;

    // Final Validation
    const availablePax = checkAvailability(selectedDate, start, end);

    if (mode === 'Event' && availablePax < 20) {
        alert("Cannot book Event: The room is not fully available for the selected time.");
        return;
    }

    if (mode === 'Study') {
        const requestedPax = parseInt(paxInput.value);
        if (requestedPax > availablePax) {
            alert(`Only ${availablePax} seats available for this time.`);
            return;
        }
    }

    // Validate time again
    let startHour = parseInt(start.split(':')[0]);
    let endHour = parseInt(end.split(':')[0]);

    startHour = normalizeHour(startHour);
    endHour = normalizeHour(endHour);

    if (endHour <= startHour) {
        alert("End time must be after start time.");
        return;
    }

    const bookingData = {
        date: selectedDate,
        startTime: start,
        endTime: end,
        duration: document.getElementById('durationDisplay').textContent,
        mode: bookingModeInput.value,
        pax: bookingModeInput.value === 'Study' ? parseInt(paxInput.value) : 0,
        name: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        addOns: [],
        cost: document.getElementById('totalCost').textContent,
        status: 'pending' // Default status
    };

    if (document.getElementById('projector').checked) bookingData.addOns.push('Projector');
    if (document.getElementById('speaker').checked) bookingData.addOns.push('Speaker');

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });

        const result = await response.json();

        if (!response.ok) {
            alert(result.error || "Booking failed.");
        } else {
            showConfirmation(result.booking);
        }
    } catch (error) {
        console.error("Booking error:", error);
        alert("An error occurred.");
    }
});

function showConfirmation(booking) {
    const details = document.getElementById('confirmationDetails');
    details.innerHTML = `
        <p><strong>Booking ID:</strong> ${booking.id}</p>
        <p><strong>Status:</strong> <span style="color:orange">Pending Approval</span></p>
        <p><strong>Name:</strong> ${booking.contact.name}</p>
        <p><strong>Date:</strong> ${booking.date}</p>
        <p><strong>Time:</strong> ${booking.startTime} - ${booking.endTime} (${booking.duration} hrs)</p>
        <p><strong>Mode:</strong> ${booking.mode} ${booking.mode === 'Study' ? `(${booking.pax} Pax)` : ''}</p>
        <p><strong>Total Cost:</strong> ₱${booking.cost}</p>
    `;
    showStep('step-confirmation');
}

// --- RETURNING USER LOGIC ---

async function lookupBookings(phone) {
    if (!phone) {
        alert("Please enter a phone number.");
        return;
    }

    userPhone = phone;
    document.getElementById('phone').value = userPhone;

    try {
        const response = await fetch(`${API_URL}?phone=${phone}`);
        const userBookings = await response.json();

        if (userBookings.length > 0) {
            renderBookingsList(userBookings);
            showStep('step-returning-list');
        } else {
            // No bookings, go to calendar
            showCalendar();
        }
    } catch (error) {
        console.error("Lookup error:", error);
        alert("Failed to find bookings.");
    }
}

// --- INITIAL PHONE FORM LOGIC ---
const initialPhoneForm = document.getElementById('initialPhoneForm');
if (initialPhoneForm) {
    initialPhoneForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const phone = document.getElementById('initialPhone').value;
        lookupBookings(phone);
    });
}

function renderBookingsList(bookingsList) {
    const container = document.getElementById('bookingsListContainer');
    container.innerHTML = '';

    if (bookingsList.length === 0) {
        container.innerHTML = '<p>No active bookings found for this number.</p>';
        return;
    }

    bookingsList.forEach(b => {
        const card = document.createElement('div');
        card.className = 'booking-card';

        let statusColor = 'orange';
        if (b.status === 'confirmed') statusColor = '#4caf50';
        if (b.status === 'rejected') statusColor = '#f44336';

        card.innerHTML = `
            <h3>${b.date} | ${b.startTime} - ${b.endTime}</h3>
            <p><strong>Mode:</strong> ${b.mode}</p>
            ${b.mode === 'Study' ? `<p><strong>Pax:</strong> ${b.pax}</p>` : ''}
            <p><strong>Cost:</strong> ₱${b.cost}</p>
            <p><strong>Status:</strong> <span style="color:${statusColor}; font-weight:bold">${b.status.toUpperCase()}</span></p>
        `;
        container.appendChild(card);
    });
}
