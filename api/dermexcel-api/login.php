<?php
require_once "config.php";

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
    exit();
}

$body = getJsonBody();

$usuario  = trim($body['usuario'] ?? '');
$password = $body['password'] ?? '';

if ($usuario === '' || $password === '') {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Usuario y contraseña son requeridos"]);
    exit();
}

$stmt = $pdo->prepare(
    "SELECT u.id, u.usuario, u.password, u.nombre, u.rol, u.activo,
            u.negocio_id, n.nombre AS negocio_nombre
     FROM usuarios u
     JOIN negocios n ON n.id = u.negocio_id
     WHERE u.usuario = :usuario AND n.activo = 1
     LIMIT 1"
);
$stmt->execute(["usuario" => $usuario]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Usuario o contraseña incorrectos"]);
    exit();
}

if (!$user['activo']) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Tu usuario está desactivado. Habla con tu administrador."]);
    exit();
}

requireRole($user, ['admin', 'vendedor']);

// Token simple (para un proyecto escolar basta; no es JWT real)
$token = bin2hex(random_bytes(24));

$stmt = $pdo->prepare("INSERT INTO sesiones (usuario_id, token, creado_en) VALUES (:uid, :token, NOW())");
$stmt->execute([
    "uid"   => $user['id'],
    "token" => $token
]);

echo json_encode([
    "success" => true,
    "message" => "Login exitoso",
    "token"   => $token,
    "usuario" => [
        "id"             => $user['id'],
        "usuario"        => $user['usuario'],
        "nombre"         => $user['nombre'],
        "rol"            => $user['rol'],
        "negocio_id"     => $user['negocio_id'],
        "negocio_nombre" => $user['negocio_nombre'],
    ]
]);
