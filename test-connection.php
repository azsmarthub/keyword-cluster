<?php
/**
 * Database Connection Test
 * Đặt file này ở thư mục gốc để test kết nối database
 */

echo "<!DOCTYPE html>";
echo "<html><head><title>Keyword Processor - Connection Test</title>";
echo "<style>body{font-family:Arial,sans-serif;margin:40px;} .success{color:green;} .error{color:red;} .info{color:blue;}</style>";
echo "</head><body>";

echo "<h1>🔍 Keyword Processor - Connection Test</h1>";

// Test PHP version
echo "<h2>📋 System Check</h2>";
echo "<p class='info'>PHP Version: " . phpversion() . "</p>";

// Check required extensions
$required_extensions = ['pdo', 'pdo_mysql', 'json', 'curl', 'fileinfo'];
foreach ($required_extensions as $ext) {
    if (extension_loaded($ext)) {
        echo "<p class='success'>✅ Extension '$ext' loaded</p>";
    } else {
        echo "<p class='error'>❌ Extension '$ext' missing</p>";
    }
}

// Test database connection
echo "<h2>🗄️ Database Connection</h2>";
try {
    require_once 'api/config/database.php';
    
    $db = DatabaseConfig::getConnection();
    echo "<p class='success'>✅ Database connection successful!</p>";
    
    // Test basic queries
    $stmt = $db->query("SELECT COUNT(*) as count FROM projects");
    $result = $stmt->fetch();
    echo "<p class='info'>📊 Projects in database: " . $result['count'] . "</p>";
    
    $stmt = $db->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "<p class='info'>📋 Tables: " . implode(', ', $tables) . "</p>";
    
    // Test insert permission
    $testStmt = $db->prepare("INSERT INTO projects (seed_keyword, original_filename, status) VALUES (?, ?, ?)");
    $testStmt->execute(['test-connection', 'test.csv', 'completed']);
    $testId = $db->lastInsertId();
    
    if ($testId) {
        echo "<p class='success'>✅ Insert permission working</p>";
        
        // Clean up test data
        $deleteStmt = $db->prepare("DELETE FROM projects WHERE id = ?");
        $deleteStmt->execute([$testId]);
        echo "<p class='info'>🧹 Test data cleaned up</p>";
    }
    
} catch (Exception $e) {
    echo "<p class='error'>❌ Database Error: " . $e->getMessage() . "</p>";
    
    // Provide helpful suggestions
    echo "<h3>💡 Troubleshooting Suggestions:</h3>";
    echo "<ul>";
    echo "<li>Check if MySQL/MariaDB is running</li>";
    echo "<li>Verify database credentials in api/config/database.php</li>";
    echo "<li>Make sure database 'keyword_processor' exists</li>";
    echo "<li>Check if user has proper permissions</li>";
    echo "<li>Verify database schema is imported</li>";
    echo "</ul>";
}

// Test file permissions
echo "<h2>📁 File Permissions</h2>";
$directories = ['uploads', 'exports', 'logs'];
foreach ($directories as $dir) {
    if (is_dir($dir)) {
        if (is_writable($dir)) {
            echo "<p class='success'>✅ '$dir' directory is writable</p>";
        } else {
            echo "<p class='error'>❌ '$dir' directory is not writable</p>";
        }
    } else {
        echo "<p class='error'>❌ '$dir' directory does not exist</p>";
    }
}

// Test API endpoints
echo "<h2>🔗 API Endpoints</h2>";
$endpoints = [
    'api/endpoints/get-projects.php',
    'api/endpoints/save-project.php'
];

foreach ($endpoints as $endpoint) {
    if (file_exists($endpoint)) {
        echo "<p class='success'>✅ '$endpoint' exists</p>";
    } else {
        echo "<p class='error'>❌ '$endpoint' missing</p>";
    }
}

// Test frontend files
echo "<h2>🎨 Frontend Files</h2>";
$frontend_files = [
    'index.html',
    'assets/css/style.css',
    'assets/js/app.js'
];

foreach ($frontend_files as $file) {
    if (file_exists($file)) {
        echo "<p class='success'>✅ '$file' exists</p>";
    } else {
        echo "<p class='error'>❌ '$file' missing</p>";
    }
}

echo "<h2>🚀 Ready to Go!</h2>";
echo "<p>If all checks are green, your Keyword Processor is ready!</p>";
echo "<p><a href='index.html' style='background:#2563eb;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;'>🔍 Open Keyword Processor</a></p>";

echo "</body></html>";
?>