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
