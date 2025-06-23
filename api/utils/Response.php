<?php
/**
 * API Response Helper
 */
class Response {
    public static function json($data, $status = 200) {
        http_response_code($status);
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            exit(0);
        }
        
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    public static function success($data, $message = 'Success') {
        self::json([
            'success' => true,
            'data' => $data,
            'message' => $message
        ]);
    }
    
    public static function error($message, $status = 400, $details = null) {
        self::json([
            'success' => false,
            'error' => $message,
            'details' => $details
        ], $status);
    }
}
?>