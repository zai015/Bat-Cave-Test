const API_URL = '../php/booking_handler.php';

let currentStep = 'step-initial-phone';
let selectedDate = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let bookings = [];
let userPhone = '';
let currentBookingData = null; // Store data for review step

// --- NAVIGATION ---

function showStep(stepId) {
    document.querySelectorAll('.wizard-step').forEach(el => el.style.display = 'none');
    const step = document.getElementById(stepId);
    if (stepId === 'step-returning-list') {
        step.style.display = 'flex';
    } else {
        step.style.display = 'block';
    }
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

function getDayAvailabilityStatus(dayBookings) {
    // Initialize 12 hourly slots (13:00 to 25:00) with max capacity 20
    // 13 = 1PM, 24 = 12AM, 25 = 1AM (closing time)
    // We check availability for slots starting at 13, 14, ... 24.
    const hourlyCapacity = {};
    for (let h = 13; h < 25; h++) {
        hourlyCapacity[h] = 20;
    }

    dayBookings.forEach(b => {
        let startH = parseInt(b.startTime.split(':')[0]);
        let endH = parseInt(b.endTime.split(':')[0]);

        startH = normalizeHour(startH);
        endH = normalizeHour(endH);

        for (let h = startH; h < endH; h++) {
            if (hourlyCapacity[h] !== undefined) {
                if (b.mode === 'Event') {
                    hourlyCapacity[h] = 0; // Event takes full room
                } else {
                    hourlyCapacity[h] -= (parseInt(b.pax) || 0);
                }
            }
        }
    });

    let fullSlots = 0;
    let totalSlots = 12;

    for (let h = 13; h < 25; h++) {
        if (hourlyCapacity[h] <= 0) {
            fullSlots++;
        }
    }

    if (fullSlots === totalSlots) return 'red'; // Fully booked all day
    if (fullSlots > 0) return 'yellow'; // Partially booked (some hours full)

    // Also check if any hour has < 20 capacity (even if not 0) -> Yellow
    for (let h = 13; h < 25; h++) {
        if (hourlyCapacity[h] < 20 && hourlyCapacity[h] > 0) {
            return 'yellow';
        }
    }

    return 'green'; // All slots have full capacity
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

        const status = getDayAvailabilityStatus(dayBookings);
        let statusClass = status; // 'green', 'yellow', 'red'
        let isClickable = true;

        if (status === 'red') {
            isClickable = false;
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
    document.getElementById('selectedDateDisplay').textContent = formatDateReadable(selectedDate);

    // Update time options based on availability
    updateStartTimeOptions();
    // Reset form values to avoid invalid states
    startHourInput.value = "";
    startAmPmInput.value = "PM";
    endHourInput.value = "";
    endAmPmInput.value = "PM";

    showStep('step-booking-details');
}

function updateStartTimeOptions() {
    const options = startHourInput.options;
    // We no longer rely on startAmPmInput.value to filter options.
    // Instead, we determine the implied AM/PM for each option.

    for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (opt.disabled && opt.value === "") continue;

        const h = parseInt(opt.value);

        // Determine implied AM/PM based on business hours (1 PM - 1 AM)
        // 12 is 12 AM (00:00)
        // 1-11 is PM
        let impliedAmPm = 'PM';
        if (h === 12) impliedAmPm = 'AM';

        // Reset text
        opt.textContent = opt.value;

        const timeStr = get24HourTime(opt.value, impliedAmPm);

        // Construct end time for 1 hour duration check
        let startH = parseInt(timeStr.split(':')[0]);
        let endH = startH + 1;
        const endStr = `${String(endH).padStart(2, '0')}:00`;

        const availability = checkAvailability(selectedDate, timeStr, endStr);

        if (availability.seats === 0) {
            opt.disabled = true;
            if (!opt.textContent.includes('(Full)')) {
                opt.textContent += ' (Full)';
            }
            opt.title = availability.reason || "Unavailable";
        } else {
            opt.disabled = false;
            opt.textContent = opt.textContent.replace(' (Full)', '');
            opt.title = "";
        }
    }
}

function updateEndTimeOptions() {
    const startVal = startHourInput.value;
    if (!startVal) return;

    // Determine start time 24h
    // We need to know the correct AM/PM for the selected start hour
    let startAmPm = 'PM';
    if (parseInt(startVal) === 12) startAmPm = 'AM';

    const startTime24 = get24HourTime(startVal, startAmPm);
    let startH = parseInt(startTime24.split(':')[0]);
    startH = normalizeHour(startH);

    const options = endHourInput.options;
    const mode = bookingModeInput.value;

    // Find the next unavailable hour to set as the limit
    const limitH = getNextUnavailableHour(startH, mode);

    for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (opt.value === "") continue;

        const h = parseInt(opt.value);

        // Determine implied AM/PM for end time
        // 12 and 1 are AM
        // 2-11 are PM
        let impliedAmPm = 'PM';
        if (h === 12 || h === 1) impliedAmPm = 'AM';

        const timeStr = get24HourTime(opt.value, impliedAmPm);
        let optH = parseInt(timeStr.split(':')[0]);
        optH = normalizeHour(optH);

        if (optH <= startH) {
            opt.disabled = true;
            opt.textContent = opt.value; // Reset text
        } else if (optH > limitH) {
            opt.disabled = true;
            opt.textContent = `${opt.value} (Conflict)`;
        } else {
            opt.disabled = false;
            opt.textContent = opt.value;
        }
    }

    // If currently selected end time is now disabled, reset it
    const currentEndVal = endHourInput.value;
    if (currentEndVal) {
        let currentEndAmPm = 'PM';
        if (parseInt(currentEndVal) === 12 || parseInt(currentEndVal) === 1) currentEndAmPm = 'AM';

        const currentEndTimeStr = get24HourTime(currentEndVal, currentEndAmPm);
        let currentEndHNorm = parseInt(currentEndTimeStr.split(':')[0]);
        currentEndHNorm = normalizeHour(currentEndHNorm);

        // Check if the current end time is valid based on start time and limits
        if (currentEndHNorm <= startH || currentEndHNorm > limitH) {
            // Also check if the specific option is disabled (covers the new limit logic)
            // But options collection access by value might be tricky, let's rely on the loop above or re-check
            // Simpler: iterate options again or check if the value is valid
            let isValid = false;
            for (let i = 0; i < options.length; i++) {
                if (options[i].value === currentEndVal && !options[i].disabled) {
                    isValid = true;
                    break;
                }
            }

            if (!isValid) {
                endHourInput.value = "";
                document.getElementById('durationDisplay').textContent = "0";
                document.getElementById('totalCost').textContent = "0";
            }
        }
    }
}

function getNextUnavailableHour(startH, mode) {
    // Check hours from startH onwards to find the first one that is blocked
    // startH is normalized (13-24)
    // We check up to 25 (1 AM)

    // Filter bookings for the same date
    const dayBookings = bookings.filter(b => b.date === selectedDate && b.status !== 'cancelled' && b.status !== 'rejected');

    for (let h = startH; h < 25; h++) {
        // Check capacity for hour h
        let currentOccupancy = 0;
        let isEvent = false;

        for (const b of dayBookings) {
            let bStart = parseInt(b.startTime.split(':')[0]);
            let bEnd = parseInt(b.endTime.split(':')[0]);

            bStart = normalizeHour(bStart);
            bEnd = normalizeHour(bEnd);

            if (h >= bStart && h < bEnd) {
                if (b.mode === 'Event') {
                    isEvent = true;
                }
                currentOccupancy += parseInt(b.pax || 0);
            }
        }

        // Determine if this hour is unavailable based on mode
        if (mode === 'Event') {
            // Event needs full room (20 seats)
            // If any occupancy exists (even 1 pax), it's unavailable for Event
            if (currentOccupancy > 0 || isEvent) {
                return h;
            }
        } else {
            // Study needs at least 1 seat
            // If occupancy is 20 or Event exists, it's unavailable
            if (currentOccupancy >= 20 || isEvent) {
                return h;
            }
        }
    }

    return 25; // No blockage found up to closing
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

// Helper to format 24-hour time to 12-hour format
function formatTime12(time24) {
    if (!time24) return '';
    let [hour, minute] = time24.split(':');
    hour = parseInt(hour);
    const amPm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${amPm}`;
}

function formatDateReadable(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function normalizeHour(hour) {
    // Normalize hours to 13-25 range for easier comparison (1PM to 1AM next day)
    if (hour < 13) return hour + 24;
    return hour;
}

function checkAvailability(date, startStr, endStr) {
    if (!date || !startStr || !endStr) return { seats: 20, reason: null };

    let startH = parseInt(startStr.split(':')[0]);
    let endH = parseInt(endStr.split(':')[0]);

    startH = normalizeHour(startH);
    endH = normalizeHour(endH);

    // Filter bookings for the same date
    const dayBookings = bookings.filter(b => b.date === date && b.status !== 'cancelled' && b.status !== 'rejected');

    let maxOccupancy = 0;
    let conflictReason = null;

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
                    return { seats: 0, reason: "Event scheduled during this time" }; // Event blocks everything
                }
                currentOccupancy += parseInt(b.pax || 0);
            }
        }
        if (currentOccupancy > maxOccupancy) {
            maxOccupancy = currentOccupancy;
        }
    }

    const remaining = Math.max(0, 20 - maxOccupancy);
    if (remaining === 0) {
        return { seats: 0, reason: "Fully booked" };
    }

    return { seats: remaining, reason: null };
}

// Auto-calculate duration and cost
[startHourInput, startAmPmInput, paxInput, document.getElementById('projector'), document.getElementById('speaker')].forEach(el => {
    el.addEventListener('change', calculateCost);
});

bookingModeInput.addEventListener('change', () => {
    updateEndTimeOptions(); // Mode affects end time limits
    calculateCost();
});

// Special handler for End Hour to auto-set AM/PM (Removed to allow user control)
// Special handler for End Hour to auto-set AM/PM
endHourInput.addEventListener('change', () => {
    const val = parseInt(endHourInput.value);
    if (val === 12 || val === 1) {
        endAmPmInput.value = 'AM';
    } else {
        endAmPmInput.value = 'PM';
    }
    calculateCost();
});

// Special handler for Start Hour to auto-set AM/PM
startHourInput.addEventListener('change', () => {
    const val = parseInt(startHourInput.value);
    if (val === 12) {
        startAmPmInput.value = 'AM';
    } else {
        startAmPmInput.value = 'PM';
    }
    updateEndTimeOptions();
    calculateCost();
});

// Listeners for AM/PM changes
startAmPmInput.addEventListener('change', () => {
    updateStartTimeOptions();
    updateEndTimeOptions();
    calculateCost();
});

endAmPmInput.addEventListener('change', () => {
    updateEndTimeOptions();
    calculateCost();
});

function calculateCost() {
    const start = get24HourTime(startHourInput.value, startAmPmInput.value);
    const end = get24HourTime(endHourInput.value, endAmPmInput.value);
    const mode = bookingModeInput.value;
    const requestedPax = parseInt(paxInput.value) || 1;

    const costDisplay = document.getElementById('costDisplay');
    const costError = document.getElementById('costError');
    const totalCostSpan = document.getElementById('totalCost');
    const durationDisplay = document.getElementById('durationDisplay');

    // Helper to show error
    function showUnavailable(reason) {
        costDisplay.style.display = 'none';
        costError.style.display = 'block';
        costError.textContent = reason || "Selected time is unavailable";
        durationDisplay.textContent = "-";
        totalCostSpan.textContent = "0.00";
    }

    // Helper to show cost
    function showCost() {
        costDisplay.style.display = 'block';
        costError.style.display = 'none';
    }

    // Toggle Pax input visibility
    if (mode === 'Event') {
        document.getElementById('paxGroup').style.display = 'none';
    } else {
        document.getElementById('paxGroup').style.display = 'block';
    }

    // Check Availability
    const availability = checkAvailability(selectedDate, start, end);
    const availablePax = availability.seats;

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
        let reason = availability.reason;
        if (!reason) {
            reason = `Room not fully available (Only ${availablePax} seats free)`;
        }
        showUnavailable(reason);
        return; // Stop calculation
    }

    if (availablePax === 0) {
        showUnavailable(availability.reason);
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
            durationDisplay.textContent = "Invalid";
            totalCostSpan.textContent = "0";
            showCost(); // Keep cost visible but 0
            return;
        }

        durationDisplay.textContent = diff.toFixed(1);

        let cost = 0;
        if (mode === 'Study') {
            cost = 50 * diff * (parseInt(paxInput.value) || 1);
        } else {
            cost = 1000 * diff;
        }

        // Add-ons
        if (document.getElementById('projector').checked) cost += 150 * diff;
        if (document.getElementById('speaker').checked) cost += 150 * diff;

        totalCostSpan.textContent = cost.toFixed(2);
        showCost();
    } else {
        // Incomplete input
        showCost();
    }
}

bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const start = get24HourTime(startHourInput.value, startAmPmInput.value);
    const end = get24HourTime(endHourInput.value, endAmPmInput.value);
    const mode = bookingModeInput.value;

    // Final Validation
    const availability = checkAvailability(selectedDate, start, end);
    const availablePax = availability.seats;

    if (mode === 'Event' && availablePax < 20) {
        let reason = availability.reason || `Room not fully available (Only ${availablePax} seats free)`;
        alert(`Cannot book Event: ${reason}`);
        return;
    }

    if (mode === 'Study') {
        const requestedPax = parseInt(paxInput.value);
        if (requestedPax > availablePax) {
            alert(`Only ${availablePax} seats available for this time. ${availability.reason || ''}`);
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

    // Show Review Step instead of submitting immediately
    currentBookingData = bookingData;
    showReviewStep(bookingData);
});

function showReviewStep(data) {
    const reviewHtml = `
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Phone:</strong> ${data.phone}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Date:</strong> ${formatDateReadable(data.date)}</p>
        <p><strong>Time:</strong> ${formatTime12(data.startTime)} - ${formatTime12(data.endTime)} (${data.duration} hrs)</p>
        <p><strong>Mode:</strong> ${data.mode} ${data.mode === 'Study' ? `(${data.pax} Pax)` : ''}</p>
        <p><strong>Add-ons:</strong> ${data.addOns.join(', ') || 'None'}</p>
        <p><strong>Total Cost:</strong> ₱${data.cost}</p>
    `;
    document.getElementById('reviewDetails').innerHTML = reviewHtml;
    showStep('step-review');
}

async function confirmBooking() {
    if (!currentBookingData) return;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentBookingData)
        });

        const result = await response.json();

        if (!response.ok) {
            alert(result.error || "Booking failed.");
        } else {
            showConfirmation(result.booking);
            currentBookingData = null; // Clear data
        }
    } catch (error) {
        console.error("Booking error:", error);
        alert("An error occurred.");
    }
}

function showConfirmation(booking) {
    const details = document.getElementById('confirmationDetails');
    details.innerHTML = `
        <p><strong>Booking ID:</strong> ${booking.id}</p>
        <p><strong>Status:</strong> <span style="color:orange">Pending Approval</span></p>
        <p><strong>Name:</strong> ${booking.contact.name}</p>
        <p><strong>Date:</strong> ${formatDateReadable(booking.date)}</p>
        <p><strong>Time:</strong> ${formatTime12(booking.startTime)} - ${formatTime12(booking.endTime)} (${booking.duration} hrs)</p>
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
        if (confirm(`Is this number correct: ${phone}?`)) {
            lookupBookings(phone);
        }
    });
}

function renderBookingsList(bookingsList) {
    const container = document.getElementById('bookingsListContainer');
    container.innerHTML = '';

    if (bookingsList.length === 0) {
        container.innerHTML = '<p>No active bookings found for this number.</p>';
        return;
    }

    // Sort by date and time (Newest/Latest first)
    bookingsList.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.startTime}`);
        const dateB = new Date(`${b.date} ${b.startTime}`);
        return dateB - dateA;
    });

    bookingsList.forEach(b => {
        const card = document.createElement('div');
        card.className = 'booking-card';

        let statusColor = 'orange';
        if (b.status === 'confirmed') statusColor = '#4caf50';
        if (b.status === 'rejected') statusColor = '#f44336';

        card.innerHTML = `
            <h3>${formatDateReadable(b.date)} | ${formatTime12(b.startTime)} - ${formatTime12(b.endTime)}</h3>
            <p><strong>Mode:</strong> ${b.mode}</p>
            ${b.mode === 'Study' ? `<p><strong>Pax:</strong> ${b.pax}</p>` : ''}
            <p><strong>Cost:</strong> ₱${b.cost}</p>
            <p><strong>Status:</strong> <span style="color:${statusColor}; font-weight:bold">${b.status.toUpperCase()}</span></p>
        `;
        container.appendChild(card);
    });
}
