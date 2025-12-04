document.getElementById("calculateBtn").addEventListener("click", calculateCost);

function calculateCost() {
    const hours = parseInt(document.getElementById("hours").value);

    if (!hours || hours <= 0) {
        alert("Please enter a valid number of hours.");
        return;
    }

    let baseRate = 50;               // per hour
    let minimumFee = 75;            // if below 2 hours
    let equipmentRate = 0;

    if (document.getElementById("projector").checked) {
        equipmentRate += 150;
    }

    if (document.getElementById("speaker").checked) {
        equipmentRate += 150;
    }

    let cost = 0;

    // Minimum fee if booking is less than 2 hours
    if (hours < 2) {
        cost = minimumFee;
    } else {
        cost = hours * baseRate;
    }

    // Add equipment cost
    cost += equipmentRate * hours;

    document.getElementById("costDisplay").style.display = "block";
    document.getElementById("costDisplay").innerHTML = `
        <strong>Estimated Cost: ₱${cost}</strong>
    `;
}

// FORM SUBMISSION
document.getElementById("bookingForm").addEventListener("submit", function(event) {
    event.preventDefault();

    // Validation
    let studentId = document.getElementById("studentId").value;
    let email = document.getElementById("email").value;
    let phone = document.getElementById("phone").value;

    if (studentId === "" || email === "" || phone === "") {
        alert("Please fill out all required fields.");
        return;
    }

    // Show confirmation message
    document.getElementById("confirmationMessage").style.display = "block";
});
