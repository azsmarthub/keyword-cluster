<?php
/**
 * Export Project Data Endpoint
 * Exports project data in various formats (JSON, CSV)
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
    $format = isset($_GET['format']) ? strtolower($_GET['format']) : 'json';
    
    if (!$projectId) {
        Response::error('Project ID is required');
    }
    
    if (!in_array($format, ['json', 'csv', 'excel'])) {
        Response::error('Invalid format. Supported: json, csv, excel');
    }
    
    $db = DatabaseConfig::getConnection();
    
    // Get project details
    $stmt = $db->prepare("SELECT * FROM projects WHERE id = ?");
    $stmt->execute([$projectId]);
    $project = $stmt->fetch();
    
    if (!$project) {
        Response::error('Project not found', 404);
    }
    
    // Get clusters
    $stmt = $db->prepare("
        SELECT c.*, 
               COUNT(k.id) as actual_keyword_count
        FROM clusters c
        LEFT JOIN keywords k ON c.id = k.cluster_id
        WHERE c.project_id = ?
        GROUP BY c.id
        ORDER BY c.total_volume DESC
    ");
    $stmt->execute([$projectId]);
    $clusters = $stmt->fetchAll();
    
    // Get keywords (optional, can be large)
    $includeKeywords = isset($_GET['include_keywords']) ? (bool)$_GET['include_keywords'] : false;
    $keywords = [];
    
    if ($includeKeywords) {
        $stmt = $db->prepare("
            SELECT k.*, c.cluster_name
            FROM keywords k
            JOIN clusters c ON k.cluster_id = c.id
            WHERE k.project_id = ?
            ORDER BY k.volume DESC
        ");
        $stmt->execute([$projectId]);
        $keywords = $stmt->fetchAll();
    }
    
    // Prepare export data
    $exportData = [
        'project' => $project,
        'clusters' => $clusters,
        'keywords' => $keywords,
        'export_info' => [
            'exported_at' => date('Y-m-d H:i:s'),
            'format' => $format,
            'include_keywords' => $includeKeywords,
            'total_clusters' => count($clusters),
            'total_keywords' => count($keywords)
        ]
    ];
    
    // Generate filename
    $timestamp = date('Y-m-d_H-i-s');
    $filename = "{$project['seed_keyword']}_export_{$timestamp}";
    
    switch ($format) {
        case 'json':
            header('Content-Type: application/json');
            header("Content-Disposition: attachment; filename=\"{$filename}.json\"");
            echo json_encode($exportData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
            
        case 'csv':
            header('Content-Type: text/csv; charset=utf-8');
            header("Content-Disposition: attachment; filename=\"{$filename}.csv\"");
            
            $output = fopen('php://output', 'w');
            
            // Write BOM for UTF-8
            fwrite($output, "\xEF\xBB\xBF");
            
            // Write project info
            fputcsv($output, ['PROJECT INFORMATION']);
            fputcsv($output, ['Seed Keyword', $project['seed_keyword']]);
            fputcsv($output, ['Original Filename', $project['original_filename']]);
            fputcsv($output, ['Total Clusters', $project['total_clusters']]);
            fputcsv($output, ['Total Keywords', $project['total_keywords']]);
            fputcsv($output, ['Total Volume', $project['total_volume']]);
            fputcsv($output, ['Average Difficulty', $project['avg_difficulty']]);
            fputcsv($output, ['Created At', $project['created_at']]);
            fputcsv($output, ['Status', $project['status']]);
            fputcsv($output, []); // Empty row
            
            // Write clusters
            fputcsv($output, ['CLUSTERS']);
            fputcsv($output, [
                'Cluster Name', 'Keyword Count', 'Supporting Keywords', 
                'Total Volume', 'Average Difficulty', 'Min-Max Difficulty',
                'Topics', 'Intent', 'Average CPC', 'Seed Keywords', 'Cluster Type'
            ]);
            
            foreach ($clusters as $cluster) {
                fputcsv($output, [
                    $cluster['cluster_name'],
                    $cluster['keyword_count'],
                    $cluster['supporting_keywords'],
                    $cluster['total_volume'],
                    $cluster['avg_difficulty'],
                    $cluster['min_difficulty'] . '-' . $cluster['max_difficulty'],
                    $cluster['topics'],
                    $cluster['intent'],
                    $cluster['avg_cpc'],
                    $cluster['seed_keywords'],
                    $cluster['cluster_type']
                ]);
            }
            
            // Write keywords if included
            if ($includeKeywords && !empty($keywords)) {
                fputcsv($output, []); // Empty row
                fputcsv($output, ['KEYWORDS']);
                fputcsv($output, [
                    'Keyword', 'Cluster Name', 'Volume', 'Difficulty', 'CPC',
                    'Competitive Density', 'SERP Features', 'Page', 'Page Type',
                    'Topic', 'Intent', 'Seed Keyword'
                ]);
                
                foreach ($keywords as $keyword) {
                    fputcsv($output, [
                        $keyword['keyword'],
                        $keyword['cluster_name'],
                        $keyword['volume'],
                        $keyword['difficulty'],
                        $keyword['cpc'],
                        $keyword['competitive_density'],
                        $keyword['serp_features'],
                        $keyword['page'],
                        $keyword['page_type'],
                        $keyword['topic'],
                        $keyword['intent'],
                        $keyword['seed_keyword']
                    ]);
                }
            }
            
            fclose($output);
            break;
            
        case 'excel':
            // For Excel format, we'll generate CSV with Excel-friendly formatting
            header('Content-Type: application/vnd.ms-excel; charset=utf-8');
            header("Content-Disposition: attachment; filename=\"{$filename}.xls\"");
            
            echo "\xEF\xBB\xBF"; // BOM
            
            // Use tab-separated values for better Excel compatibility
            $separator = "\t";
            
            // Project information
            echo "PROJECT INFORMATION\n";
            echo "Seed Keyword{$separator}{$project['seed_keyword']}\n";
            echo "Original Filename{$separator}{$project['original_filename']}\n";
            echo "Total Clusters{$separator}{$project['total_clusters']}\n";
            echo "Total Keywords{$separator}{$project['total_keywords']}\n";
            echo "Total Volume{$separator}{$project['total_volume']}\n";
            echo "Average Difficulty{$separator}{$project['avg_difficulty']}\n";
            echo "Created At{$separator}{$project['created_at']}\n";
            echo "Status{$separator}{$project['status']}\n";
            echo "\n";
            
            // Clusters
            echo "CLUSTERS\n";
            $headers = [
                'Cluster Name', 'Keyword Count', 'Supporting Keywords',
                'Total Volume', 'Average Difficulty', 'Min-Max Difficulty',
                'Topics', 'Intent', 'Average CPC', 'Seed Keywords', 'Cluster Type'
            ];
            echo implode($separator, $headers) . "\n";
            
            foreach ($clusters as $cluster) {
                $row = [
                    $cluster['cluster_name'],
                    $cluster['keyword_count'],
                    $cluster['supporting_keywords'],
                    $cluster['total_volume'],
                    $cluster['avg_difficulty'],
                    $cluster['min_difficulty'] . '-' . $cluster['max_difficulty'],
                    $cluster['topics'],
                    $cluster['intent'],
                    $cluster['avg_cpc'],
                    $cluster['seed_keywords'],
                    $cluster['cluster_type']
                ];
                echo implode($separator, $row) . "\n";
            }
            
            // Keywords if included
            if ($includeKeywords && !empty($keywords)) {
                echo "\nKEYWORDS\n";
                $keywordHeaders = [
                    'Keyword', 'Cluster Name', 'Volume', 'Difficulty', 'CPC',
                    'Competitive Density', 'SERP Features', 'Page', 'Page Type',
                    'Topic', 'Intent', 'Seed Keyword'
                ];
                echo implode($separator, $keywordHeaders) . "\n";
                
                foreach ($keywords as $keyword) {
                    $row = [
                        $keyword['keyword'],
                        $keyword['cluster_name'],
                        $keyword['volume'],
                        $keyword['difficulty'],
                        $keyword['cpc'],
                        $keyword['competitive_density'] ?? '',
                        $keyword['serp_features'] ?? '',
                        $keyword['page'] ?? '',
                        $keyword['page_type'] ?? '',
                        $keyword['topic'] ?? '',
                        $keyword['intent'] ?? '',
                        $keyword['seed_keyword'] ?? ''
                    ];
                    echo implode($separator, $row) . "\n";
                }
            }
            break;
    }
    
    exit;
    
} catch (Exception $e) {
    error_log("Export project error: " . $e->getMessage());
    Response::error('Failed to export project: ' . $e->getMessage());
}
?>