<?php
// ============================================================
// get_status.php — Read current LED status
// Called by: ESP32 (every 1-2 s) + Dashboard JS (every 2 s)
// Returns JSON: { "status": 0|1|2, "updated_at": "..." }
// ============================================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');   // allow ESP32 cross-origin

require_once 'db_config.php';

$conn = getConnection();

// Always read the first row (we only ever keep one row)
$result = $conn->query("SELECT status, updated_at FROM led_status WHERE id = 1 LIMIT 1");

if ($result && $result->num_rows > 0) {
    $row = $result->fetch_assoc();
    echo json_encode([
        'status'     => (int) $row['status'],
        'updated_at' => $row['updated_at']
    ]);
} else {
    // Fallback: no row exists yet
    echo json_encode(['status' => 0, 'updated_at' => null]);
}

$conn->close();