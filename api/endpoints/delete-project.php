<?php
/**
 * Delete Project Endpoint
 * Deletes a project and all associated clusters, keywords, and logs
 */

require_once '../config/database.php';
require_once '../utils/Response.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    Response::error('Method not allowed', 405);
}

try {
    $projectId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    
    if (!$projectId) {
        Response::error('Project ID is required');
    }
    
    $db = DatabaseConfig::getConnection();
    $db->beginTransaction();
    
    // Check if project exists
    $stmt = $db->prepare("SELECT id, seed_keyword FROM projects WHERE id = ?");
    $stmt->execute([$projectId]);
    $project = $stmt->fetch();
    
    if (!$project) {
        $db->rollBack();
        Response::error('Project not found', 404);
    }
    
    // Get counts before deletion for response
    $stmt = $db->prepare("SELECT COUNT(*) FROM clusters WHERE project_id = ?");
    $stmt->execute([$projectId]);
    $clusterCount = $stmt->fetchColumn();
    
    $stmt = $db->prepare("SELECT COUNT(*) FROM keywords WHERE project_id = ?");
    $stmt->execute([$projectId]);
    $keywordCount = $stmt->fetchColumn();
    
    $stmt = $db->prepare("SELECT COUNT(*) FROM webhook_logs WHERE project_id = ?");
    $stmt->execute([$projectId]);
    $webhookLogCount = $stmt->fetchColumn();
    
    // Delete in correct order (foreign key constraints)
    // 1. Delete keywords first
    $stmt = $db->prepare("DELETE FROM keywords WHERE project_id = ?");
    $stmt->execute([$projectId]);
    
    // 2. Delete webhook logs
    $stmt = $db->prepare("DELETE FROM webhook_logs WHERE project_id = ?");
    $stmt->execute([$projectId]);
    
    // 3. Delete clusters
    $stmt = $db->prepare("DELETE FROM clusters WHERE project_id = ?");
    $stmt->execute([$projectId]);
    
    // 4. Finally delete the project
    $stmt = $db->prepare("DELETE FROM projects WHERE id = ?");
    $stmt->execute([$projectId]);
    
    $db->commit();
    
    Response::success([
        'project_id' => $projectId,
        'seed_keyword' => $project['seed_keyword'],
        'deleted_counts' => [
            'keywords' => $keywordCount,
            'clusters' => $clusterCount,
            'webhook_logs' => $webhookLogCount
        ]
    ], 'Project deleted successfully');
    
} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    error_log("Delete project error: " . $e->getMessage());
    Response::error('Failed to delete project: ' . $e->getMessage());
}
?>