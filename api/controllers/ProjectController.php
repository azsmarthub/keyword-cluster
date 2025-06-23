<?php
require_once '../config/database.php';
require_once '../utils/Response.php';

/**
 * Project Controller
 */
class ProjectController {
    private $db;
    
    public function __construct() {
        $this->db = DatabaseConfig::getConnection();
    }
    
    public function saveProject($data) {
        try {
            $this->db->beginTransaction();
            
            // Validate input
            if (!isset($data['metadata']) || !isset($data['clusters'])) {
                throw new Exception('Invalid data format');
            }
            
            $metadata = $data['metadata'];
            
            // Insert project
            $stmt = $this->db->prepare("
                INSERT INTO projects (
                    seed_keyword, original_filename, total_clusters, 
                    total_keywords, total_volume, avg_difficulty,
                    pillar_pages, sub_pages, processing_time_ms, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
            ");
            
            $stmt->execute([
                $metadata['seed_keyword'],
                $metadata['filename'],
                $metadata['total_clusters'],
                $metadata['total_keywords'],
                $metadata['total_volume'],
                $metadata['avg_difficulty'],
                $metadata['pillar_pages'] ?? 0,
                $metadata['sub_pages'] ?? 0,
                $metadata['processing_time_ms']
            ]);
            
            $projectId = $this->db->lastInsertId();
            
            // Insert clusters
            foreach ($data['clusters'] as $cluster) {
                $stmt = $this->db->prepare("
                    INSERT INTO clusters (
                        project_id, cluster_name, keyword_count,
                        supporting_keywords, total_volume, avg_difficulty,
                        min_difficulty, max_difficulty, topics, intent,
                        avg_cpc, seed_keywords
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                
                // Parse min/max difficulty
                $minMax = explode('-', $cluster['min_max_difficulty'] ?? '0-0');
                $minDiff = (int)($minMax[0] ?? 0);
                $maxDiff = (int)($minMax[1] ?? 0);
                
                $stmt->execute([
                    $projectId,
                    $cluster['cluster_name'],
                    $cluster['keyword_count'],
                    $cluster['supporting_keywords'],
                    $cluster['total_volume'],
                    $cluster['avg_difficulty'],
                    $minDiff,
                    $maxDiff,
                    $cluster['topics'],
                    $cluster['intent'],
                    $cluster['avg_cpc'],
                    $cluster['seed_keywords']
                ]);
            }
            
            $this->db->commit();
            
            return [
                'project_id' => $projectId,
                'clusters_saved' => count($data['clusters'])
            ];
            
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
    
    public function getProjects($page = 1, $limit = 20, $search = '') {
        $offset = ($page - 1) * $limit;
        
        $whereClause = '';
        $params = [];
        
        if ($search) {
            $whereClause = 'WHERE seed_keyword LIKE ? OR original_filename LIKE ?';
            $params = ["%$search%", "%$search%"];
        }
        
        // Get total count
        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM projects $whereClause");
        $countStmt->execute($params);
        $totalCount = $countStmt->fetchColumn();
        
        // Get projects
        $stmt = $this->db->prepare("
            SELECT * FROM project_summary 
            $whereClause 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        ");
        $stmt->execute(array_merge($params, [$limit, $offset]));
        $projects = $stmt->fetchAll();
        
        return [
            'projects' => $projects,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => ceil($totalCount / $limit),
                'total_items' => $totalCount,
                'items_per_page' => $limit
            ]
        ];
    }
}
?>