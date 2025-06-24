<?php
/**
 * Export Project Data Endpoint
 * File: api/endpoints/export-project.php
 * Path: /keyword-processor/api/endpoints/export-project.php
 * Function: Export project data in JSON, CSV, or Excel format
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
        SELECT * FROM clusters 
        WHERE project_id = ?
        ORDER BY total_volume DESC
    ");
    $stmt->execute([$projectId]);
    $clusters = $stmt->fetchAll();
    
    // Generate filename
    $timestamp = date('Y-m-d_H-i-s');
    $filename = "{$project['seed_keyword']}_export_{$timestamp}";
    
    switch ($format) {
        case 'json':
            header('Content-Type: application/json');
            header("Content-Disposition: attachment; filename=\"{$filename}.json\"");
            
            $exportData = [
                'project' => $project,
                'clusters' => $clusters,
                'export_info' => [
                    'exported_at' => date('Y-m-d H:i:s'),
                    'total_clusters' => count($clusters)
                ]
            ];
            
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
            fputcsv($output, ['Total Clusters', $project['total_clusters']]);
            fputcsv($output, ['Total Keywords', $project['total_keywords']]);
            fputcsv($output, ['Total Volume', $project['total_volume']]);
            fputcsv($output, ['Average Difficulty', $project['avg_difficulty']]);
            fputcsv($output, []); // Empty row
            
            // Write clusters
            fputcsv($output, ['CLUSTERS']);
            fputcsv($output, [
                'Cluster Name', 'Keyword Count', 'Supporting Keywords', 
                'Total Volume', 'Average Difficulty', 'Min-Max Difficulty',
                'Topics', 'Intent', 'Average CPC', 'Seed Keywords'
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
                    $cluster['seed_keywords']
                ]);
            }
            
            fclose($output);
            break;
            
        case 'excel':
            // For Excel format, generate tab-separated values
            header('Content-Type: application/vnd.ms-excel; charset=utf-8');
            header("Content-Disposition: attachment; filename=\"{$filename}.xls\"");
            
            echo "\xEF\xBB\xBF"; // BOM
            
            $separator = "\t";
            
            // Project information
            echo "PROJECT INFORMATION\n";
            echo "Seed Keyword{$separator}{$project['seed_keyword']}\n";
            echo "Total Clusters{$separator}{$project['total_clusters']}\n";
            echo "Total Keywords{$separator}{$project['total_keywords']}\n";
            echo "Total Volume{$separator}{$project['total_volume']}\n";
            echo "Average Difficulty{$separator}{$project['avg_difficulty']}\n";
            echo "\n";
            
            // Clusters
            echo "CLUSTERS\n";
            $headers = [
                'Cluster Name', 'Keyword Count', 'Supporting Keywords',
                'Total Volume', 'Average Difficulty', 'Min-Max Difficulty',
                'Topics', 'Intent', 'Average CPC', 'Seed Keywords'
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
                    $cluster['seed_keywords']
                ];
                echo implode($separator, $row) . "\n";
            }
            break;
    }
    
    exit;
    
} catch (Exception $e) {
    error_log("Export project error: " . $e->getMessage());
    Response::error('Failed to export project: ' . $e->getMessage());
}
?>