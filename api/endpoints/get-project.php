<?php
/**
 * Get Project Details Endpoint
 * Retrieves detailed project information including clusters and keywords
 */

require_once '../config/database.php';
require_once '../utils/Response.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

try {
    $projectId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    $includeClusters = isset($_GET['include_clusters']) ? (bool)$_GET['include_clusters'] : true;
    $includeKeywords = isset($_GET['include_keywords']) ? (bool)$_GET['include_keywords'] : false;
    
    if (!$projectId) {
        Response::error('Project ID is required');
    }
    
    $db = DatabaseConfig::getConnection();
    
    // Get project details
    $stmt = $db->prepare("
        SELECT p.*, 
               COUNT(DISTINCT c.id) as actual_cluster_count,
               COUNT(DISTINCT k.id) as actual_keyword_count,
               COALESCE(SUM(c.total_volume), 0) as calculated_total_volume
        FROM projects p
        LEFT JOIN clusters c ON p.id = c.project_id
        LEFT JOIN keywords k ON p.id = k.project_id
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
        'clusters' => [],
        'keywords' => []
    ];
    
    // Get clusters if requested
    if ($includeClusters) {
        $stmt = $db->prepare("
            SELECT c.*, 
                   COUNT(k.id) as keyword_count_actual
            FROM clusters c
            LEFT JOIN keywords k ON c.id = k.cluster_id
            WHERE c.project_id = ?
            GROUP BY c.id
            ORDER BY c.total_volume DESC
        ");
        $stmt->execute([$projectId]);
        $result['clusters'] = $stmt->fetchAll();
    }
    
    // Get keywords if requested (limit to 1000 for performance)
    if ($includeKeywords) {
        $stmt = $db->prepare("
            SELECT k.*, c.cluster_name
            FROM keywords k
            JOIN clusters c ON k.cluster_id = c.id
            WHERE k.project_id = ?
            ORDER BY k.volume DESC
            LIMIT 1000
        ");
        $stmt->execute([$projectId]);
        $result['keywords'] = $stmt->fetchAll();
    }
    
    Response::success($result);
    
} catch (Exception $e) {
    error_log("Get project details error: " . $e->getMessage());
    Response::error('Failed to get project details: ' . $e->getMessage());
}
?>