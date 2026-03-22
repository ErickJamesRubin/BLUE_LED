<?php
// ============================================================
// update.php — Update LED status & write to log
// Method : POST  (or GET for quick testing)
// Params : status = 0 | 1 | 2
// Returns: JSON  { "success": true, "status": <int>, "message": "..." }
// ============================================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle pre-flight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db_config.php';

// ── Accept both POST body and GET query string ──────────────
$raw    = file_get_contents('php://input');
$body   = json_decode($raw, true);
$status = $body['status'] ?? $_POST['status'] ?? $_GET['status'] ?? null;

// Validate
if ($status === null || !in_array((int)$status, [0, 1, 2], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid status value. Use 0, 1, or 2.']);
    exit();
}

$status = (int)$status;

// Action labels for the log
$labels = [0 => 'TURN OFF', 1 => 'TURN ON', 2 => 'BLINK'];
$action = $labels[$status];

$conn = getConnection();

// ── 1. Update (or insert) the single led_status row ─────────
$stmt = $conn->prepare(
    "INSERT INTO led_status (id, status) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = NOW()"
);
$stmt->bind_param('i', $status);
$stmt->execute();
$stmt->close();

// ── 2. Append a log entry ────────────────────────────────────
$stmt2 = $conn->prepare(
    "INSERT INTO logs (action, value) VALUES (?, ?)"
);
$stmt2->bind_param('si', $action, $status);
$stmt2->execute();
$stmt2->close();

$conn->close();

echo json_encode([
    'success' => true,
    'status'  => $status,
    'message' => "LED set to: $action"
]);