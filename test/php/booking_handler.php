<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$dataFile = '../data/bookings.json';

function getBookings()
{
    global $dataFile;
    if (!file_exists($dataFile)) {
        return [];
    }
    $json = file_get_contents($dataFile);
    return json_decode($json, true) ?: [];
}

function saveBookings($bookings)
{
    global $dataFile;
    file_put_contents($dataFile, json_encode($bookings, JSON_PRETTY_PRINT));
}

function checkAvailability($bookings, $date, $startTime, $endTime, $mode, $pax)
{
    $start = strtotime("$date $startTime");
    $end = strtotime("$date $endTime");

    // Max capacity for Study Mode
    $maxCapacity = 20;

    $conflicts = [];
    $currentPax = 0;

    foreach ($bookings as $booking) {
        if ($booking['date'] !== $date)
            continue;
        if ($booking['status'] === 'cancelled' || $booking['status'] === 'rejected')
            continue;

        $bStart = strtotime("{$booking['date']} {$booking['startTime']}");
        $bEnd = strtotime("{$booking['date']} {$booking['endTime']}");

        // Check for time overlap
        if ($start < $bEnd && $end > $bStart) {
            // Overlap found
            if ($mode === 'Event') {
                // Event mode requires EMPTY room
                return ['available' => false, 'reason' => 'Room is not empty for this time slot.'];
            }

            if ($booking['mode'] === 'Event') {
                // Cannot book if there is an existing Event
                return ['available' => false, 'reason' => 'Room is blocked by an Event.'];
            }

            // If we are Study mode and existing is Study mode, sum pax
            if ($mode === 'Study' && $booking['mode'] === 'Study') {
                $currentPax += $booking['pax'];
            }
        }
    }

    if ($mode === 'Study') {
        if (($currentPax + $pax) > $maxCapacity) {
            return ['available' => false, 'reason' => "Capacity exceeded. Only " . ($maxCapacity - $currentPax) . " slots remaining."];
        }
    }

    return ['available' => true];
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $bookings = getBookings();

    if (isset($_GET['phone'])) {
        // Return bookings for a specific user (Returning User Flow)
        $phone = $_GET['phone'];
        $userBookings = array_filter($bookings, function ($b) use ($phone) {
            return $b['contact']['phone'] === $phone;
        });
        echo json_encode(array_values($userBookings));
    } else {
        // Return all bookings (Calendar View & Admin)
        echo json_encode($bookings);
    }
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid input']);
        exit;
    }

    $bookings = getBookings();

    // Check if this is an Admin Action (approve/reject/delete)
    if (isset($input['action']) && isset($input['id'])) {
        $found = false;
        $updatedBookings = [];

        foreach ($bookings as $booking) {
            if ($booking['id'] === $input['id']) {
                $found = true;
                if ($input['action'] === 'approve') {
                    $booking['status'] = 'confirmed';
                    $updatedBookings[] = $booking;
                } elseif ($input['action'] === 'reject') {
                    $booking['status'] = 'rejected';
                    $updatedBookings[] = $booking;
                } elseif ($input['action'] === 'delete') {
                    // Skip adding to updatedBookings to delete
                    continue;
                }
            } else {
                $updatedBookings[] = $booking;
            }
        }

        if ($found) {
            saveBookings($updatedBookings);
            echo json_encode(['success' => true]);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Booking not found']);
        }
        exit;
    }

    // Normal Booking Creation
    // Validation
    $availability = checkAvailability(
        $bookings,
        $input['date'],
        $input['startTime'],
        $input['endTime'],
        $input['mode'],
        $input['pax'] ?? 0
    );

    if (!$availability['available']) {
        http_response_code(409); // Conflict
        echo json_encode(['error' => $availability['reason']]);
        exit;
    }

    // Create new booking
    $newBooking = [
        'id' => uniqid('bk_'),
        'date' => $input['date'],
        'startTime' => $input['startTime'],
        'endTime' => $input['endTime'],
        'duration' => $input['duration'],
        'mode' => $input['mode'],
        'pax' => $input['pax'] ?? 0,
        'contact' => [
            'name' => $input['name'],
            'email' => $input['email'],
            'phone' => $input['phone']
        ],
        'addOns' => $input['addOns'] ?? [],
        'cost' => $input['cost'],
        'status' => 'pending', // Default status is now pending
        'createdAt' => date('c')
    ];

    $bookings[] = $newBooking;
    saveBookings($bookings);

    echo json_encode(['success' => true, 'booking' => $newBooking]);
}
?>