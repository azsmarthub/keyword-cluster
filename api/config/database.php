<?php
/**
 * Database Configuration
 */
class DatabaseConfig {
    private const HOST = 'localhost';
    private const DB_NAME = 'keyword_processor';
    private const USERNAME = 'kw_processor';  // Thay bằng username của bạn
    private const PASSWORD = 'your_secure_password_123';  // Thay bằng password của bạn
    private const CHARSET = 'utf8mb4';
    
    public static function getConnection() {
        try {
            $dsn = "mysql:host=" . self::HOST . ";dbname=" . self::DB_NAME . ";charset=" . self::CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . self::CHARSET
            ];
            
            return new PDO($dsn, self::USERNAME, self::PASSWORD, $options);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            throw new Exception("Database connection failed");
        }
    }
}
?>