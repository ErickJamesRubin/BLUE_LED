<?php
// ============================================================
// db_config.php — Shared Database Connection
// ============================================================
// ⚙️  Edit these values to match your MySQL setup
define('DB_HOST', 'localhost');
define('DB_USER', 'root');        // your MySQL username
define('DB_PASS', '');            // your MySQL password
define('DB_NAME', 'esp32_led');

/**
 * Returns a MySQLi connection or dies with an error message.
 */
function getConnection(): mysqli {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        http_response_code(500);
        die(json_encode(['error' => 'Database connection failed: ' . $conn->connect_error]));
    }
    $conn->set_charset('utf8mb4');
    return $conn;
}