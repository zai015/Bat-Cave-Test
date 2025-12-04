<?php
header('Content-Type: application/json');

$usersFile = '../data/users.json';

// Helper to read users
function getUsers()
{
    global $usersFile;
    if (!file_exists($usersFile)) {
        return [];
    }
    $content = file_get_contents($usersFile);
    return json_decode($content, true) ?? [];
}

// Helper to save users
function saveUsers($users)
{
    global $usersFile;
    file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT));
}

$action = $_POST['action'] ?? '';

if ($action === 'check_users') {
    $users = getUsers();
    echo json_encode(['hasUsers' => count($users) > 0]);
    exit;
}

if ($action === 'register') {
    $users = getUsers();
    if (count($users) > 0) {
        echo json_encode(['success' => false, 'message' => 'Admin already exists']);
        exit;
    }

    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    if (!$username || !$password) {
        echo json_encode(['success' => false, 'message' => 'Username and password required']);
        exit;
    }

    // In a real app, hash the password!
    // For this test environment, we'll store it as is or simple hash if desired, 
    // but let's stick to simple storage as per plan, maybe simple base64 to not be plain text
    $newUser = [
        'username' => $username,
        'password' => $password // storing plain for simplicity in this specific student project context, or could use password_hash
    ];

    $users[] = $newUser;
    saveUsers($users);
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'login') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    $users = getUsers();
    foreach ($users as $user) {
        if ($user['username'] === $username && $user['password'] === $password) {
            echo json_encode(['success' => true]);
            exit;
        }
    }

    echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Invalid action']);
?>