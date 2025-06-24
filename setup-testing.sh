#!/bin/bash

# ============================================
# Keyword Processor - Quick Testing Setup Script
# Auto-creates all testing files and sets permissions
# ============================================

echo "🚀 Keyword Processor - Testing System Setup"
echo "============================================="

# Check if we're in the right directory
if [ ! -f "index.html" ]; then
    echo "❌ Error: Please run this script from the keyword-processor root directory"
    exit 1
fi

# Create test-system-check.php
echo "📋 Creating test-system-check.php..."
cat > test-system-check.php << 'EOF'
<?php
/**
 * System Requirements Check Helper
 * Returns JSON with system check results
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$required_extensions = ['pdo', 'pdo_mysql', 'json', 'curl', 'fileinfo', 'mbstring'];
$extensions_status = [];
$all_requirements_met = true;

// Check PHP version
$php_version = PHP_VERSION;
$php_version_ok = version_compare($php_version, '7.4.0') >= 0;

if (!$php_version_ok) {
    $all_requirements_met = false;
}

// Check extensions
foreach ($required_extensions as $ext) {
    $loaded = extension_loaded($ext);
    $extensions_status[] = [
        'name' => $ext,
        'loaded' => $loaded
    ];
    
    if (!$loaded) {
        $all_requirements_met = false;
    }
}

// Additional checks
$memory_limit = ini_get('memory_limit');
$max_execution_time = ini_get('max_execution_time');
$upload_max_filesize = ini_get('upload_max_filesize');
$post_max_size = ini_get('post_max_size');

$response = [
    'php_version' => $php_version,
    'php_version_ok' => $php_version_ok,
    'extensions' => $extensions_status,
    'all_requirements_met' => $all_requirements_met,
    'php_config' => [
        'memory_limit' => $memory_limit,
        'max_execution_time' => $max_execution_time,
        'upload_max_filesize' => $upload_max_filesize,
        'post_max_size' => $post_max_size
    ],
    'server_info' => [
        'software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
        'php_sapi' => PHP_SAPI,
        'os' => PHP_OS
    ]
];

echo json_encode($response, JSON_PRETTY_PRINT);
?>
EOF

# Create test-database-check.php
echo "🗄️ Creating test-database-check.php..."
cat > test-database-check.php << 'EOF'
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
EOF

# Create test-permissions-check.php
echo "📁 Creating test-permissions-check.php..."
cat > test-permissions-check.php << 'EOF'
<?php
/**
 * File Permissions Check Helper
 * Returns JSON with file and directory permission status
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$directories_to_check = [
    'uploads',
    'exports', 
    'logs',
    'api',
    'api/config',
    'api/controllers',
    'api/endpoints',
    'api/utils',
    'assets',
    'assets/css',
    'assets/js'
];

$files_to_check = [
    'index.html',
    'assets/css/style.css',
    'assets/js/app.js',
    'api/config/database.php',
    'api/config/config.php',
    'api/utils/Response.php',
    'api/controllers/ProjectController.php',
    'api/endpoints/get-projects.php',
    'api/endpoints/save-project.php'
];

$response = [
    'directories' => [],
    'files' => [],
    'overall_status' => true
];

// Check directories
foreach ($directories_to_check as $dir) {
    $exists = is_dir($dir);
    $writable = $exists ? is_writable($dir) : false;
    $readable = $exists ? is_readable($dir) : false;
    
    $dir_info = [
        'path' => $dir,
        'exists' => $exists,
        'writable' => $writable,
        'readable' => $readable,
        'permissions' => $exists ? substr(sprintf('%o', fileperms($dir)), -4) : null
    ];
    
    // Special check for upload directories
    if (in_array($dir, ['uploads', 'exports', 'logs']) && (!$exists || !$writable)) {
        $response['overall_status'] = false;
    }
    
    $response['directories'][] = $dir_info;
}

// Check files
foreach ($files_to_check as $file) {
    $exists = file_exists($file);
    $readable = $exists ? is_readable($file) : false;
    $writable = $exists ? is_writable($file) : false;
    $size = $exists ? filesize($file) : 0;
    
    $file_info = [
        'path' => $file,
        'exists' => $exists,
        'readable' => $readable,
        'writable' => $writable,
        'size' => $size,
        'permissions' => $exists ? substr(sprintf('%o', fileperms($file)), -4) : null
    ];
    
    // Critical files check
    $critical_files = ['index.html', 'api/config/database.php', 'api/utils/Response.php'];
    if (in_array($file, $critical_files) && !$exists) {
        $response['overall_status'] = false;
    }
    
    $response['files'][] = $file_info;
}

// Additional system info
$response['system_info'] = [
    'current_user' => get_current_user(),
    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? '',
    'script_filename' => $_SERVER['SCRIPT_FILENAME'] ?? ''
];

// Disk space check
$response['disk_info'] = [
    'free_space' => disk_free_space('.'),
    'total_space' => disk_total_space('.'),
    'free_space_mb' => round(disk_free_space('.') / 1024 / 1024, 2),
    'total_space_mb' => round(disk_total_space('.') / 1024 / 1024, 2)
];

echo json_encode($response, JSON_PRETTY_PRINT);
?>
EOF

# Create health check script
echo "🏥 Creating health-check.sh..."
cat > health-check.sh << 'EOF'
#!/bin/bash
echo "🔍 Keyword Processor Health Check"
echo "================================="

# Check if web server is running
if pgrep apache2 > /dev/null || pgrep nginx > /dev/null || pgrep httpd > /dev/null; then
    echo "✅ Web server is running"
else
    echo "❌ Web server is not running"
fi

# Check if MySQL is running  
if pgrep mysql > /dev/null || pgrep mariadb > /dev/null; then
    echo "✅ Database server is running"
else
    echo "❌ Database server is not running"
fi

# Check key files exist
if [ -f "test-connection.php" ]; then
    echo "✅ Test files exist"
else
    echo "❌ Test files missing"
fi

# Check directory permissions
if [ -w "uploads" ]; then
    echo "✅ Upload directory writable"
else
    echo "❌ Upload directory not writable"
fi

if [ -f "api/config/database.php" ]; then
    echo "✅ Database config exists"
else
    echo "❌ Database config missing"
fi

echo "================================="
echo "🌐 Access dashboard: http://your-domain/keyword-processor/test-connection.php"
echo "🚀 Main app: http://your-domain/keyword-processor/"
EOF

# Set permissions
echo "🔧 Setting file permissions..."

# Make scripts executable
chmod +x health-check.sh
chmod 644 test-*.php

# Set directory permissions
chmod 755 . 2>/dev/null || echo "⚠️ Could not set root directory permissions"

# Create and set permissions for required directories
for dir in uploads exports logs; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        echo "📁 Created directory: $dir"
    fi
    chmod 777 "$dir" 2>/dev/null || echo "⚠️ Could not set permissions for $dir"
done

# Set API directory permissions
if [ -d "api" ]; then
    chmod 755 api/
    find api/ -type f -name "*.php" -exec chmod 644 {} \; 2>/dev/null || echo "⚠️ Could not set API file permissions"
fi

# Create security .htaccess files
echo "🛡️ Creating security files..."

# Protect config directory
if [ -d "api/config" ]; then
    echo "deny from all" > api/config/.htaccess
    echo "✅ Protected api/config/"
fi

# Protect logs directory
if [ -d "logs" ]; then
    echo "deny from all" > logs/.htaccess
    echo "✅ Protected logs/"
fi

# Create main .htaccess for security
cat > .htaccess << 'HTACCESS_EOF'
# Security Headers
<IfModule mod_headers.c>
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
</IfModule>

# Disable directory browsing
Options -Indexes

# Protect sensitive files
<FilesMatch "\.(log|sql|md|sh)$">
    Order allow,deny
    Deny from all
</FilesMatch>

# Enable mod_rewrite
<IfModule mod_rewrite.c>
    RewriteEngine On
</IfModule>
HTACCESS_EOF

echo "✅ Created main .htaccess"

# Create sample CSV for testing
if [ ! -f "sample_clusters_2025-01-01.csv" ]; then
    echo "📊 Creating sample CSV for testing..."
    cat > sample_clusters_2025-01-01.csv << 'CSV_EOF'
Keyword,Volume,Keyword Difficulty,CPC (USD),Page,Page type,Topic,Intent
best coffee machine,5000,45,2.50,coffee-machine-guide,Pillar,Coffee Equipment,Commercial
espresso machine review,3000,40,3.20,coffee-machine-guide,Pillar,Coffee Equipment,Commercial
coffee maker comparison,2500,38,2.80,coffee-machine-guide,Pillar,Coffee Equipment,Commercial
drip coffee maker,4000,35,2.10,drip-coffee-makers,Sub Page,Coffee Equipment,Commercial
french press coffee,1500,25,1.80,french-press-guide,Sub Page,Coffee Equipment,Informational
pour over coffee,1200,30,1.90,pour-over-guide,Sub Page,Coffee Equipment,Informational
coffee grinder,2000,42,2.30,coffee-grinder-guide,Sub Page,Coffee Equipment,Commercial
automatic coffee machine,3500,48,3.10,automatic-coffee-machines,Sub Page,Coffee Equipment,Commercial
CSV_EOF
    echo "✅ Created sample CSV file"
fi

# Final status check
echo ""
echo "🎯 Setup Complete! Summary:"
echo "=========================="

# Check what was created
if [ -f "test-system-check.php" ]; then
    echo "✅ test-system-check.php created"
else
    echo "❌ test-system-check.php failed"
fi

if [ -f "test-database-check.php" ]; then
    echo "✅ test-database-check.php created"
else
    echo "❌ test-database-check.php failed"
fi

if [ -f "test-permissions-check.php" ]; then
    echo "✅ test-permissions-check.php created"
else
    echo "❌ test-permissions-check.php failed"
fi

if [ -f "health-check.sh" ]; then
    echo "✅ health-check.sh created"
else
    echo "❌ health-check.sh failed"
fi

# Check directories
for dir in uploads exports logs; do
    if [ -d "$dir" ] && [ -w "$dir" ]; then
        echo "✅ $dir/ directory ready"
    else
        echo "❌ $dir/ directory issue"
    fi
done

echo ""
echo "🚀 Next Steps:"
echo "1. Run health check: ./health-check.sh"
echo "2. Access test dashboard: http://your-domain/keyword-processor/test-connection.php"
echo "3. Configure database in: api/config/database.php"
echo "4. Import database schema from: install/database.sql"
echo "5. Test with sample CSV: sample_clusters_2025-01-01.csv"
echo ""
echo "📞 Need help? Check the setup guide or run individual tests:"
echo "   - System: test-system-check.php"  
echo "   - Database: test-database-check.php"
echo "   - Permissions: test-permissions-check.php"
echo ""
echo "🎉 Happy keyword processing!"
EOF