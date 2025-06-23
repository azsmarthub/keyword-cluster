<?php
/**
 * Application Configuration
 */
class AppConfig {
    public const APP_NAME = 'Keyword Processor';
    public const APP_VERSION = '1.0.0';
    public const APP_ENV = 'development'; // development, production
    
    // File upload settings
    public const MAX_FILE_SIZE = 52428800; // 50MB
    public const ALLOWED_FILE_TYPES = ['csv'];
    public const UPLOAD_DIR = '../uploads/';
    public const EXPORT_DIR = '../exports/';
    
    // CORS settings
    public const CORS_ALLOWED_ORIGINS = ['*'];
    
    public static function isDebug() {
        return self::APP_ENV === 'development';
    }
}
?>