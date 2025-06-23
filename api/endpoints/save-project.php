<?php
require_once '../controllers/ProjectController.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        Response::error('Invalid JSON payload');
    }
    
    $controller = new ProjectController();
    $result = $controller->saveProject($input);
    
    Response::success($result, 'Project saved successfully');
    
} catch (Exception $e) {
    Response::error($e->getMessage());
}
?>