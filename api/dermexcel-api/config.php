<?php
// ============================================================
// CONFIG.PHP - Conexión a la base de datos, cabeceras comunes
// y helpers de autenticación/roles para el modelo SaaS.
// ============================================================

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// -------- Datos de conexión (ajusta a tu XAMPP/servidor) --------
$DB_HOST = "localhost";
$DB_NAME = getenv("FIADOS_DB_NAME") ?: "fiados_saas";
$DB_USER = "root";
$DB_PASS = "";

try {
    $pdo = new PDO(
        "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error de conexión a la base de datos: " . $e->getMessage()
    ]);
    exit();
}

// Helper para leer el body JSON que manda Axios/HttpClient
function getJsonBody() {
    $data = json_decode(file_get_contents("php://input"), true);
    return $data ?? [];
}

// ============================================================
// AUTENTICACIÓN MULTI-TENANT
// ============================================================
// Todo endpoint (menos login.php) debe llamar requireAuth($pdo) al
// inicio. Regresa el usuario actual { id, usuario, nombre, rol,
// negocio_id } tomado del token, y con eso se filtra TODA consulta
// por negocio_id — así es como un negocio nunca ve datos de otro.
//
// El front manda el token en el header: Authorization: Bearer <token>
// ============================================================
function requireAuth(PDO $pdo): array {
    $headers = function_exists('getallheaders') ? getallheaders() : [];

    $authHeader = $headers['Authorization']
        ?? $headers['authorization']
        ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');

    if (!$authHeader || stripos($authHeader, 'Bearer ') !== 0) {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Falta el token de sesión"]);
        exit();
    }

    $token = trim(substr($authHeader, 7));

    $stmt = $pdo->prepare(
        "SELECT u.id, u.usuario, u.nombre, u.rol, u.negocio_id, u.activo
         FROM sesiones s
         JOIN usuarios u ON u.id = s.usuario_id
         JOIN negocios n ON n.id = u.negocio_id
         WHERE s.token = :token AND n.activo = 1 AND s.creado_en >= NOW() - INTERVAL 7 DAY
         LIMIT 1"
    );
    $stmt->execute(["token" => $token]);
    $usuario = $stmt->fetch();

    if (!$usuario || !$usuario['activo']) {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Sesión inválida o expirada"]);
        exit();
    }

    return $usuario;
}

// Corta la ejecución con 403 si el usuario actual no tiene uno de los
// roles permitidos. Uso: requireRole($usuarioActual, ['admin']);
function requireRole(array $usuarioActual, array $rolesPermitidos): void {
    if (!in_array($usuarioActual['rol'], $rolesPermitidos, true)) {
        http_response_code(403);
        echo json_encode([
            "success" => false,
            "message" => "No tienes permiso para realizar esta acción"
        ]);
        exit();
    }
}
