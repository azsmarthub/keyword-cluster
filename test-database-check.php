<?php
/**
 * Database Connection Check Helper
 * Returns JSON with database check results
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    require_once 'api/config/database.php';
    
    $db = DatabaseConfig::getConnection();
    
    // Test basic connection
    $response = [
        'connection_ok' => true,
        'error' => null
    ];
    
    // Get table list
    $stmt = $db->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $response['tables'] = $tables;
    
    // Get counts
    if (in_array('projects', $tables)) {
        $stmt = $db->query("SELECT COUNT(*) FROM projects");
        $response['project_count'] = (int)$stmt->fetchColumn();
    } else {
        $response['project_count'] = 0;
    }
    
    if (in_array('clusters', $tables)) {
        $stmt = $db->query("SELECT COUNT(*) FROM clusters");
        $response['cluster_count'] = (int)$stmt->fetchColumn();
    } else {
        $response['cluster_count'] = 0;
    }
    
    if (in_array('keywords', $tables)) {
        $stmt = $db->query("SELECT COUNT(*) FROM keywords");
        $response['keyword_count'] = (int)$stmt->fetchColumn();
    } else {
        $response['keyword_count'] = 0;
    }
    
    // Test permissions
    try {
        $testStmt = $db->prepare("INSERT INTO projects (seed_keyword, original_filename, status) VALUES (?, ?, ?)");
        $testStmt->execute(['test-connection', 'test.csv', 'completed']);
        $testId = $db->lastInsertId();
        
        if ($testId) {
            $response['insert_permission'] = true;
            
            // Clean up test data
            $deleteStmt = $db->prepare("DELETE FROM projects WHERE id = ?");
            $deleteStmt->execute([$testId]);
            $response['cleanup_successful'] = true;
        }
        
    } catch (Exception $e) {
        $response['insert_permission'] = false;
        $response['insert_error'] = $e->getMessage();
    }
    
    // Database server info
    $stmt = $db->query("SELECT VERSION() as version");
    $version = $stmt->fetch();
    $response['server_version'] = $version['version'];
    
    // Character set info
    $stmt = $db->query("SELECT @@character_set_database as charset, @@collation_database as collation");
    $charset_info = $stmt->fetch();
    $response['charset'] = $charset_info['charset'];
    $response['collation'] = $charset_info['collation'];
    
} catch (Exception $e) {
    $response = [
        'connection_ok' => false,
        'error' => $e->getMessage(),
        'tables' => [],
        'project_count' => 0,
        'cluster_count' => 0,
        'keyword_count' => 0
    ];
}

echo json_encode($response, JSON_PRETTY_PRINT);
?>
