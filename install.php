<?php
/**
 * Keyword Processor Auto Installer
 * Tự động tạo cấu trúc thư mục và setup cơ bản
 */

// Chỉ cho phép chạy từ command line hoặc localhost
// if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1', 'localhost'])) {
//     die('Installation only allowed from localhost');
// }

echo "<!DOCTYPE html>";
echo "<html><head><title>Keyword Processor - Auto Installer</title>";
echo "<style>
    body {font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5;}
    .container {background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);}
    .success {color: #16a34a; background: #dcfce7; padding: 10px; border-radius: 5px; margin: 10px 0;}
    .error {color: #dc2626; background: #fee2e2; padding: 10px; border-radius: 5px; margin: 10px 0;}
    .warning {color: #d97706; background: #fef3c7; padding: 10px; border-radius: 5px; margin: 10px 0;}
    .info {color: #2563eb; background: #dbeafe; padding: 10px; border-radius: 5px; margin: 10px 0;}
    .step {border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; background: #f8fafc;}
    .btn {background: #2563eb; color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block;}
    pre {background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 5px; overflow-x: auto;}
</style>";
echo "</head><body>";

echo "<div class='container'>";
echo "<h1>🚀 Keyword Processor Auto Installer</h1>";

// Step 1: Check requirements
echo "<div class='step'>";
echo "<h2>📋 Step 1: System Requirements Check</h2>";

$requirements_ok = true;

// PHP Version
if (version_compare(PHP_VERSION, '7.4.0') >= 0) {
    echo "<div class='success'>✅ PHP Version: " . PHP_VERSION . " (OK)</div>";
} else {
    echo "<div class='error'>❌ PHP Version: " . PHP_VERSION . " (Requires 7.4+)</div>";
    $requirements_ok = false;
}

// PHP Extensions
$required_extensions = ['pdo', 'pdo_mysql', 'json', 'curl', 'fileinfo', 'mbstring'];
foreach ($required_extensions as $ext) {
    if (extension_loaded($ext)) {
        echo "<div class='success'>✅ Extension: $ext</div>";
    } else {
        echo "<div class='error'>❌ Extension missing: $ext</div>";
        $requirements_ok = false;
    }
}

echo "</div>";

// Step 2: Create directories
echo "<div class='step'>";
echo "<h2>📁 Step 2: Create Directory Structure</h2>";

$directories = [
    'assets/css',
    'assets/js',
    'api/config',
    'api/models',
    'api/controllers',
    'api/endpoints',
    'api/utils',
    'uploads',
    'exports',
    'logs',
    'install'
];

foreach ($directories as $dir) {
    if (!is_dir($dir)) {
        if (mkdir($dir, 0755, true)) {
            echo "<div class='success'>✅ Created: $dir</div>";
        } else {
            echo "<div class='error'>❌ Failed to create: $dir</div>";
        }
    } else {
        echo "<div class='info'>📁 Already exists: $dir</div>";
    }
}

// Set permissions
foreach (['uploads', 'exports', 'logs'] as $dir) {
    if (is_dir($dir)) {
        chmod($dir, 0777);
        echo "<div class='success'>✅ Set permissions 777 for: $dir</div>";
    }
}

echo "</div>";

// Step 3: Database configuration
echo "<div class='step'>";
echo "<h2>🗄️ Step 3: Database Configuration</h2>";

if ($_POST['action'] ?? '' === 'configure_db') {
    $host = $_POST['db_host'] ?? 'localhost';
    $username = $_POST['db_username'] ?? '';
    $password = $_POST['db_password'] ?? '';
    $database = $_POST['db_database'] ?? 'keyword_processor';
    
    try {
        // Test connection
        $dsn = "mysql:host=$host;charset=utf8mb4";
        $pdo = new PDO($dsn, $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Create database if not exists
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `$database` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        echo "<div class='success'>✅ Database '$database' created/verified</div>";
        
        // Create database config file
        $config_content = "<?php
/**
 * Database Configuration - Auto Generated
 */
class DatabaseConfig {
    private const HOST = '$host';
    private const DB_NAME = '$database';
    private const USERNAME = '$username';
    private const PASSWORD = '$password';
    private const CHARSET = 'utf8mb4';
    
    public static function getConnection() {
        try {
            \$dsn = \"mysql:host=\" . self::HOST . \";dbname=\" . self::DB_NAME . \";charset=\" . self::CHARSET;
            \$options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => \"SET NAMES \" . self::CHARSET
            ];
            
            return new PDO(\$dsn, self::USERNAME, self::PASSWORD, \$options);
        } catch (PDOException \$e) {
            error_log(\"Database connection failed: \" . \$e->getMessage());
            throw new Exception(\"Database connection failed\");
        }
    }
}
?>";
        
        if (file_put_contents('api/config/database.php', $config_content)) {
            echo "<div class='success'>✅ Database config file created</div>";
        }
        
        // Import database schema
        $pdo->exec("USE `$database`");
        
        $schema = file_get_contents('install/database.sql');
        if ($schema) {
            $statements = explode(';', $schema);
            foreach ($statements as $statement) {
                $statement = trim($statement);
                if (!empty($statement)) {
                    $pdo->exec($statement);
                }
            }
            echo "<div class='success'>✅ Database schema imported successfully</div>";
        } else {
            echo "<div class='warning'>⚠️ Schema file not found. Please import manually.</div>";
        }
        
    } catch (Exception $e) {
        echo "<div class='error'>❌ Database error: " . $e->getMessage() . "</div>";
    }
} else {
    // Show database config form
    echo "<form method='POST' action=''>";
    echo "<input type='hidden' name='action' value='configure_db'>";
    echo "<table style='width: 100%;'>";
    echo "<tr><td>Host:</td><td><input type='text' name='db_host' value='localhost' style='width:300px;padding:8px;'></td></tr>";
    echo "<tr><td>Username:</td><td><input type='text' name='db_username' placeholder='Database username' style='width:300px;padding:8px;'></td></tr>";
    echo "<tr><td>Password:</td><td><input type='password' name='db_password' placeholder='Database password' style='width:300px;padding:8px;'></td></tr>";
    echo "<tr><td>Database:</td><td><input type='text' name='db_database' value='keyword_processor' style='width:300px;padding:8px;'></td></tr>";
    echo "</table><br>";
    echo "<button type='submit' class='btn'>Configure Database</button>";
    echo "</form>";
}

echo "</div>";

// Step 4: Create essential files
echo "<div class='step'>";
echo "<h2>⚙️ Step 4: Create Essential Files</h2>";

// Create app config
if (!file_exists('api/config/config.php')) {
    $app_config = "<?php
/**
 * Application Configuration - Auto Generated
 */
class AppConfig {
    public const APP_NAME = 'Keyword Processor';
    public const APP_VERSION = '1.0.0';
    public const APP_ENV = 'development';
    
    public const MAX_FILE_SIZE = 52428800; // 50MB
    public const ALLOWED_FILE_TYPES = ['csv'];
    public const UPLOAD_DIR = '../uploads/';
    public const EXPORT_DIR = '../exports/';
    
    public const CORS_ALLOWED_ORIGINS = ['*'];
    
    public static function isDebug() {
        return self::APP_ENV === 'development';
    }
}
?>";
    
    if (file_put_contents('api/config/config.php', $app_config)) {
        echo "<div class='success'>✅ App config created</div>";
    }
}

// Create Response utility
if (!file_exists('api/utils/Response.php')) {
    $response_class = "<?php
/**
 * API Response Helper - Auto Generated
 */
class Response {
    public static function json(\$data, \$status = 200) {
        http_response_code(\$status);
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        
        if (\$_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            exit(0);
        }
        
        echo json_encode(\$data, JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    public static function success(\$data, \$message = 'Success') {
        self::json([
            'success' => true,
            'data' => \$data,
            'message' => \$message
        ]);
    }
    
    public static function error(\$message, \$status = 400, \$details = null) {
        self::json([
            'success' => false,
            'error' => \$message,
            'details' => \$details
        ], \$status);
    }
}
?>";
    
    if (file_put_contents('api/utils/Response.php', $response_class)) {
        echo "<div class='success'>✅ Response utility created</div>";
    }
}

// Create .htaccess for security
$htaccess_content = "# Protect sensitive files
<Files ~ \"^\.ht\">
Order allow,deny
Deny from all
</Files>

# Protect config files
<FilesMatch \"\.(php)$\">
    <RequireAll>
        Require all denied
        Require local
    </RequireAll>
</FilesMatch>

# Allow only specific endpoints
<FilesMatch \"^(save-project|get-projects|get-project|update-project|delete-project)\.php$\">
    Require all granted
</FilesMatch>";

file_put_contents('api/config/.htaccess', "deny from all");
file_put_contents('logs/.htaccess', "deny from all");

echo "<div class='success'>✅ Security files created</div>";

echo "</div>";

// Step 5: Final check
echo "<div class='step'>";
echo "<h2>✅ Step 5: Installation Complete</h2>";

if (file_exists('api/config/database.php')) {
    echo "<div class='success'>🎉 Installation completed successfully!</div>";
    echo "<div class='info'>
        <h3>Next Steps:</h3>
        <ol>
            <li>Copy your HTML, CSS, and JS files to appropriate directories</li>
            <li>Update the JavaScript to connect to PHP endpoints</li>
            <li>Test the connection using <a href='test-connection.php'>test-connection.php</a></li>
            <li>Try uploading the sample CSV file</li>
        </ol>
    </div>";
    
    echo "<br><a href='test-connection.php' class='btn'>🔧 Test Installation</a> ";
    echo "<a href='index.html' class='btn'>🚀 Open Application</a>";
} else {
    echo "<div class='warning'>⚠️ Installation partially complete. Please configure database first.</div>";
}

echo "</div>";

echo "</div>"; // container
echo "</body></html>";
?>