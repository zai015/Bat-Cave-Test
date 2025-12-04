<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$dataFile = '../data/menu.json';

function getMenu()
{
    global $dataFile;
    if (!file_exists($dataFile)) {
        return [];
    }
    $json = file_get_contents($dataFile);
    return json_decode($json, true) ?: [];
}

function saveMenu($menu)
{
    global $dataFile;
    if (file_put_contents($dataFile, json_encode($menu, JSON_PRETTY_PRINT)) === false) {
        return false;
    }
    return true;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $menu = getMenu();
    echo json_encode($menu);
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    // Debug Logging
    file_put_contents('debug_log.txt', date('Y-m-d H:i:s') . " - Input: " . print_r($input, true) . "\n", FILE_APPEND);

    if (!$input) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid input']);
        exit;
    }

    $menu = getMenu();

    // Check for delete action
    if (isset($input['action']) && $input['action'] === 'delete' && isset($input['id'])) {
        $updatedMenu = array_filter($menu, function ($item) use ($input) {
            return $item['id'] !== $input['id'];
        });
        if (!saveMenu(array_values($updatedMenu))) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to write to menu file']);
            exit;
        }
        echo json_encode(['success' => true]);
        exit;
    }

    // Create or Update
    if (isset($input['id']) && !empty($input['id'])) {
        // Update existing
        $found = false;
        foreach ($menu as &$item) {
            if ($item['id'] === $input['id']) {
                $item = array_merge($item, $input);
                $found = true;
                break;
            }
        }
        if (!$found) {
            http_response_code(404);
            echo json_encode(['error' => 'Item not found']);
            exit;
        }
    } else {
        // Create new
        $newItem = $input;
        $newItem['id'] = uniqid('item_');
        $menu[] = $newItem;
    }

    if (!saveMenu($menu)) {
        file_put_contents('debug_log.txt', date('Y-m-d H:i:s') . " - Save Failed\n", FILE_APPEND);
        http_response_code(500);
        echo json_encode(['error' => 'Failed to write to menu file']);
        exit;
    }
    file_put_contents('debug_log.txt', date('Y-m-d H:i:s') . " - Save Success\n", FILE_APPEND);
    echo json_encode(['success' => true]);
}
?>