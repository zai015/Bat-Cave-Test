<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$dataFile = '../data/menu.json';
$imgDir = '../img/';

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

    // Check if it's a JSON request (delete action) or FormData (save/update)
    $contentType = $_SERVER["CONTENT_TYPE"] ?? '';

    if (strpos($contentType, 'application/json') !== false) {
        $input = json_decode(file_get_contents('php://input'), true);
    } else {
        // Assume FormData
        $input = $_POST;
    }

    // Debug Logging
    // file_put_contents('debug_log.txt', date('Y-m-d H:i:s') . " - Input: " . print_r($input, true) . "\n", FILE_APPEND);

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

    // Handle File Upload
    $imagePath = $input['image'] ?? '';
    if (isset($_FILES['imageFile']) && $_FILES['imageFile']['error'] === UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES['imageFile']['tmp_name'];
        $fileName = $_FILES['imageFile']['name'];
        $fileNameCmps = explode(".", $fileName);
        $fileExtension = strtolower(end($fileNameCmps));

        // Sanitize filename
        $newFileName = md5(time() . $fileName) . '.' . $fileExtension;

        // Ensure img dir exists
        if (!file_exists($imgDir)) {
            mkdir($imgDir, 0777, true);
        }

        $dest_path = $imgDir . $newFileName;

        if (move_uploaded_file($fileTmpPath, $dest_path)) {
            $imagePath = '../img/' . $newFileName;
        }
    }

    // Prepare Item Data
    $newItem = [
        'name' => $input['name'] ?? '',
        'price' => floatval($input['price'] ?? 0),
        'category' => $input['category'] ?? '',
        'image' => $imagePath,
        'subDescription' => $input['subDescription'] ?? '',
        'description' => $input['description'] ?? '',
        'isPopular' => ($input['isPopular'] === '1' || $input['isPopular'] === 'true'),
        'isSignature' => ($input['isSignature'] === '1' || $input['isSignature'] === 'true')
    ];

    // Create or Update
    if (isset($input['id']) && !empty($input['id'])) {
        // Update existing
        $found = false;
        foreach ($menu as &$item) {
            if ($item['id'] === $input['id']) {
                $newItem['id'] = $item['id'];
                // If no new image uploaded and no existing image passed (shouldn't happen with hidden input), keep old
                if (empty($newItem['image'])) {
                    $newItem['image'] = $item['image'];
                }

                $item = array_merge($item, $newItem);
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
        $newItem['id'] = uniqid('item_');
        $menu[] = $newItem;
    }

    if (!saveMenu($menu)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to write to menu file']);
        exit;
    }
    echo json_encode(['success' => true]);
}
?>