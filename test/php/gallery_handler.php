<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$dataFile = '../data/gallery.json';
$imgDir = '../img/';

// Ensure data file exists
if (!file_exists($dataFile)) {
    // specific default data if file is missing
    $defaults = [
        ["id" => 1, "image" => "../img/gal1.png", "caption" => "Gallery Image 1"],
        ["id" => 2, "image" => "../img/gal2.png", "caption" => "Gallery Image 2"],
        ["id" => 3, "image" => "../img/gal3.png", "caption" => "Gallery Image 3"],
        ["id" => 4, "image" => "../img/gal4.png", "caption" => "Gallery Image 4"],
        ["id" => 5, "image" => "../img/gal5.png", "caption" => "Gallery Image 5"],
        ["id" => 6, "image" => "../img/gal6.png", "caption" => "Gallery Image 6"],
        ["id" => 7, "image" => "../img/gal9.png", "caption" => "Gallery Image 7"],
        ["id" => 8, "image" => "../img/gal8.png", "caption" => "Gallery Image 8"]
    ];
    file_put_contents($dataFile, json_encode($defaults, JSON_PRETTY_PRINT));
}

function getGallery()
{
    global $dataFile;
    if (!file_exists($dataFile)) {
        return [];
    }
    $json = file_get_contents($dataFile);
    return json_decode($json, true) ?: [];
}

function saveGallery($data)
{
    global $dataFile;
    if (file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT)) === false) {
        return false;
    }
    return true;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    echo json_encode(getGallery());
} elseif ($method === 'POST') {
    // Check Content Type
    $contentType = $_SERVER["CONTENT_TYPE"] ?? '';
    
    // Determine input
    $input = [];
    if (strpos($contentType, 'application/json') !== false) {
        $input = json_decode(file_get_contents('php://input'), true);
    } else {
        $input = $_POST;
    }

    if (!$input) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid input']);
        exit;
    }

    $gallery = getGallery();
    $id = intval($input['id'] ?? 0);
    
    if ($id < 1 || $id > 8) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid slot ID']);
        exit;
    }

    // Find the item to update
    $targetIndex = -1;
    foreach ($gallery as $index => $item) {
        if ($item['id'] === $id) {
            $targetIndex = $index;
            break;
        }
    }

    if ($targetIndex === -1) {
        // Should not happen if initialized correctly, but handle just in case
        $targetIndex = count($gallery);
        $gallery[] = ['id' => $id];
    }

    // Handle File Upload
    $imagePath = $gallery[$targetIndex]['image'] ?? '';
    
    if (isset($_FILES['imageFile']) && $_FILES['imageFile']['error'] === UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES['imageFile']['tmp_name'];
        $fileName = $_FILES['imageFile']['name'];
        $fileNameCmps = explode(".", $fileName);
        $fileExtension = strtolower(end($fileNameCmps));
        
        $newFileName = 'gallery_' . $id . '_' . time() . '.' . $fileExtension;
        
        if (!file_exists($imgDir)) {
            mkdir($imgDir, 0777, true);
        }
        
        $dest_path = $imgDir . $newFileName;
        
        if (move_uploaded_file($fileTmpPath, $dest_path)) {
            $imagePath = '../img/' . $newFileName;
        }
    } else if (isset($input['image'])) {
         // Allow manual path update if needed, but mainly we use file upload
         // Or if 'image' is passed as existing path from hidden field
         $imagePath = $input['image'];
    }

    // Update Data
    $gallery[$targetIndex]['image'] = $imagePath;
    if (isset($input['caption'])) {
        $gallery[$targetIndex]['caption'] = $input['caption'];
    }

    if (saveGallery($gallery)) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save gallery data']);
    }
}
?>
