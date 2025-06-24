<?php
/**
 * Get Project Details Endpoint
 * File: api/endpoints/get-project.php
 * Path: /keyword-processor/api/endpoints/get-project.php
 * Function: Get detailed project information including clusters
 */

require_once '../config/database.php';
require_once '../utils/Response.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

try {
    $projectId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    $includeClusters = isset($_GET['include_clusters']) ? (bool)$_GET['include_clusters'] : true;
    
    if (!$projectId) {
        Response::error('Project ID is required');
    }
    
    $db = DatabaseConfig::getConnection();
    
    // Get project details
    $stmt = $db->prepare("
        SELECT p.*, 
               COUNT(DISTINCT c.id) as actual_cluster_count,
               COALESCE(SUM(c.total_volume), 0) as calculated_total_volume
        FROM projects p
        LEFT JOIN clusters c ON p.id = c.project_id
        WHERE p.id = ?
        GROUP BY p.id
    ");
    $stmt->execute([$projectId]);
    $project = $stmt->fetch();
    
    if (!$project) {
        Response::error('Project not found', 404);
    }
    
    $result = [
        'project' => $project,
        'clusters' => []
    ];
    
    // Get clusters if requested
    if ($includeClusters) {
        $stmt = $db->prepare("
            SELECT * FROM clusters
            WHERE project_id = ?
            ORDER BY total_volume DESC
        ");
        $stmt->execute([$projectId]);
        $result['clusters'] = $stmt->fetchAll();
    }
    
    Response::success($result);
    
} catch (Exception $e) {
    error_log("Get project details error: " . $e->getMessage());
    Response::error('Failed to get project details: ' . $e->getMessage());
}
?>