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
