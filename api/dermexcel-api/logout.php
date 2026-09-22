<?php
require_once 'config.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit(); }
requireAuth($pdo);
$headers = function_exists('getallheaders') ? getallheaders() : [];
$token = trim(substr($headers['Authorization'] ?? $headers['authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '', 7));
$stmt = $pdo->prepare('DELETE FROM sesiones WHERE token = ?');
$stmt->execute([$token]);
echo json_encode(['success' => true]);
