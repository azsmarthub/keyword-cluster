<?php
/**
 * Update Project Endpoint
 * Updates project metadata and clusters
 */

require_once '../config/database.php';
require_once '../utils/Response.php';

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if (!in_array($_SERVER['REQUEST_METHOD'], ['PUT', 'POST'])) {
    Response::error('Method not allowed', 405);
}

try {
    $projectId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    
    if (!$projectId) {
        Response::error('Project ID is required');
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        Response::error('Invalid JSON payload');
    }
    
    $db = DatabaseConfig::getConnection();
    $db->beginTransaction();
    
    // Check if project exists
    $stmt = $db->prepare("SELECT id FROM projects WHERE id = ?");
    $stmt->execute([$projectId]);
    if (!$stmt->fetch()) {
        $db->rollBack();
        Response::error('Project not found', 404);
    }
    
    // Update project metadata if provided
    if (isset($input['metadata'])) {
        $metadata = $input['metadata'];
        $stmt = $db->prepare("
            UPDATE projects SET 
                seed_keyword = ?,
                total_clusters = ?,
                total_keywords = ?,
                total_volume = ?,
                avg_difficulty = ?,
                pillar_pages = ?,
                sub_pages = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        
        $stmt->execute([
            $metadata['seed_keyword'] ?? '',
            $metadata['total_clusters'] ?? 0,
            $metadata['total_keywords'] ?? 0,
            $metadata['total_volume'] ?? 0,
            $metadata['avg_difficulty'] ?? 0,
            $metadata['pillar_pages'] ?? 0,
            $metadata['sub_pages'] ?? 0,
            $projectId
        ]);
    }
    
    // Update clusters if provided
    if (isset($input['clusters']) && is_array($input['clusters'])) {
        // Delete existing clusters for this project
        $stmt = $db->prepare("DELETE FROM clusters WHERE project_id = ?");
        $stmt->execute([$projectId]);
        
        // Insert updated clusters
        foreach ($input['clusters'] as $cluster) {
            $stmt = $db->prepare("
                INSERT INTO clusters (
                    project_id, cluster_name, keyword_count,
                    supporting_keywords, total_volume, avg_difficulty,
                    min_difficulty, max_difficulty, topics, intent,
                    avg_cpc, seed_keywords, cluster_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            // Parse min/max difficulty
            $minMax = explode('-', $cluster['min_max_difficulty'] ?? '0-0');
            $minDiff = (int)($minMax[0] ?? 0);
            $maxDiff = (int)($minMax[1] ?? 0);
            
            // Determine cluster type
            $clusterType = 'unknown';
            if (isset($cluster['page_type'])) {
                $pageTypeLower = strtolower($cluster['page_type']);
                if (strpos($pageTypeLower, 'pillar') !== false || strpos($pageTypeLower, 'main') !== false) {
                    $clusterType = 'pillar';
                } elseif (strpos($pageTypeLower, 'sub') !== false) {
                    $clusterType = 'sub_page';
                }
            }
            
            $stmt->execute([
                $projectId,
                $cluster['cluster_name'] ?? '',
                $cluster['keyword_count'] ?? 0,
                $cluster['supporting_keywords'] ?? '',
                $cluster['total_volume'] ?? 0,
                $cluster['avg_difficulty'] ?? 0,
                $minDiff,
                $maxDiff,
                $cluster['topics'] ?? '',
                $cluster['intent'] ?? '',
                $cluster['avg_cpc'] ?? 0,
                $cluster['seed_keywords'] ?? '',
                $clusterType
            ]);
        }
    }
    
    // Update individual cluster if provided
    if (isset($input['cluster_id']) && isset($input['cluster_data'])) {
        $clusterId = (int)$input['cluster_id'];
        $clusterData = $input['cluster_data'];
        
        // Verify cluster belongs to this project
        $stmt = $db->prepare("SELECT id FROM clusters WHERE id = ? AND project_id = ?");
        $stmt->execute([$clusterId, $projectId]);
        if (!$stmt->fetch()) {
            $db->rollBack();
            Response::error('Cluster not found or does not belong to this project', 404);
        }
        
        $stmt = $db->prepare("
            UPDATE clusters SET 
                cluster_name = ?,
                keyword_count = ?,
                supporting_keywords = ?,
                total_volume = ?,
                avg_difficulty = ?,
                topics = ?,
                intent = ?,
                avg_cpc = ?,
                seed_keywords = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        
        $stmt->execute([
            $clusterData['cluster_name'] ?? '',
            $clusterData['keyword_count'] ?? 0,
            $clusterData['supporting_keywords'] ?? '',
            $clusterData['total_volume'] ?? 0,
            $clusterData['avg_difficulty'] ?? 0,
            $clusterData['topics'] ?? '',
            $clusterData['intent'] ?? '',
            $clusterData['avg_cpc'] ?? 0,
            $clusterData['seed_keywords'] ?? '',
            $clusterId
        ]);
    }
    
    // Delete cluster if requested
    if (isset($input['delete_cluster_id'])) {
        $clusterId = (int)$input['delete_cluster_id'];
        
        // Verify cluster belongs to this project
        $stmt = $db->prepare("SELECT id FROM clusters WHERE id = ? AND project_id = ?");
        $stmt->execute([$clusterId, $projectId]);
        if (!$stmt->fetch()) {
            $db->rollBack();
            Response::error('Cluster not found or does not belong to this project', 404);
        }
        
        // Delete the cluster (keywords will be deleted by foreign key constraint)
        $stmt = $db->prepare("DELETE FROM clusters WHERE id = ?");
        $stmt->execute([$clusterId]);
    }
    
    $db->commit();
    
    Response::success([
        'project_id' => $projectId,
        'updated' => true
    ], 'Project updated successfully');
    
} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    error_log("Update project error: " . $e->getMessage());
    Response::error('Failed to update project: ' . $e->getMessage());
}
?>