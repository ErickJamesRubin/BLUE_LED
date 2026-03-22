<?php
// ============================================================
// get_logs.php — Returns recent activity logs (JSON)
// Returns last 50 log entries, newest first
// ============================================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'db_config.php';

$conn   = getConnection();
$result = $conn->query(
    "SELECT id, action, value, timestamp
       FROM logs
      ORDER BY id DESC
      LIMIT 50"
);

$rows = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $rows[] = [
            'id'        => (int)   $row['id'],
            'action'    =>         $row['action'],
            'value'     => (int)   $row['value'],
            'timestamp' =>         $row['timestamp'],
        ];
    }
}

$conn->close();
echo json_encode($rows);