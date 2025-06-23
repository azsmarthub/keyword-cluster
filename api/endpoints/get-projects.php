<?php
require_once '../controllers/ProjectController.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

try {
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? min((int)$_GET['limit'], 100) : 20;
    $search = isset($_GET['search']) ? $_GET['search'] : '';
    
    $controller = new ProjectController();
    $result = $controller->getProjects($page, $limit, $search);
    
    Response::success($result);
    
} catch (Exception $e) {
    Response::error($e->getMessage());
}
?>