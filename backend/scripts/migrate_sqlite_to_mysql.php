<?php

declare(strict_types=1);

function parseEnvFile(string $path): array
{
    $values = [];
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);

        if (
            (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
            (str_starts_with($value, "'") && str_ends_with($value, "'"))
        ) {
            $value = substr($value, 1, -1);
        }

        $values[$key] = $value;
    }

    return $values;
}

function mysqlIdentifierList(array $columns): string
{
    return implode(', ', array_map(static fn (string $column): string => "`{$column}`", $columns));
}

$root = dirname(__DIR__);
$envPath = $root . DIRECTORY_SEPARATOR . '.env';
$sqlitePath = $root . DIRECTORY_SEPARATOR . 'database' . DIRECTORY_SEPARATOR . 'database.sqlite';

if (!is_file($envPath)) {
    fwrite(STDERR, "No se encontro el archivo .env\n");
    exit(1);
}

if (!is_file($sqlitePath)) {
    fwrite(STDERR, "No se encontro la base SQLite de origen\n");
    exit(1);
}

$env = parseEnvFile($envPath);

$dbHost = $env['DB_HOST'] ?? '127.0.0.1';
$dbPort = $env['DB_PORT'] ?? '3306';
$dbName = $env['DB_DATABASE'] ?? '';
$dbUser = $env['DB_USERNAME'] ?? 'root';
$dbPass = $env['DB_PASSWORD'] ?? '';

if ($dbName === '') {
    fwrite(STDERR, "DB_DATABASE no esta configurada en .env\n");
    exit(1);
}

$sqlite = new PDO('sqlite:' . $sqlitePath, null, null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

$mysql = new PDO(
    sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $dbHost, $dbPort, $dbName),
    $dbUser,
    $dbPass,
    [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
    ]
);

$sourceTables = array_map(
    static fn (array $row): string => (string) $row['name'],
    $sqlite->query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")->fetchAll()
);

$targetTables = array_map(
    static fn (array $row): string => (string) array_values($row)[0],
    $mysql->query('SHOW TABLES')->fetchAll()
);

$tables = array_values(array_intersect($sourceTables, $targetTables));

$preferredOrder = [
    'cache',
    'failed_jobs',
    'job_batches',
    'jobs',
    'migrations',
    'tenants',
    'users',
    'companies',
    'positions',
    'personal_groups',
    'projects',
    'people',
    'vehicles',
    'vessels',
    'requirements',
    'documents',
    'personal_access_tokens',
    'sessions',
];

$tableConfigs = [
    'users' => ['primary_key' => 'id', 'unique_key' => 'email'],
    'companies' => ['primary_key' => 'id', 'unique_key' => 'ruc'],
    'projects' => ['primary_key' => 'id', 'unique_key' => 'code'],
    'positions' => ['primary_key' => 'id', 'unique_key' => 'name'],
    'personal_groups' => ['primary_key' => 'id', 'unique_key' => 'name'],
    'vehicles' => ['primary_key' => 'id', 'unique_key' => 'plate'],
    'vessels' => ['primary_key' => 'id', 'unique_key' => 'registration'],
];

$foreignKeyMaps = [
    'projects' => ['company_id' => 'companies'],
    'people' => [
        'project_id' => 'projects',
        'company_id' => 'companies',
        'position_id' => 'positions',
        'personal_group_id' => 'personal_groups',
    ],
    'vehicles' => [
        'project_id' => 'projects',
        'company_id' => 'companies',
        'position_id' => 'positions',
    ],
    'vessels' => [
        'project_id' => 'projects',
        'company_id' => 'companies',
    ],
    'requirements' => [
        'project_id' => 'projects',
        'position_id' => 'positions',
    ],
    'documents' => [
        'requirement_id' => 'requirements',
        'uploaded_by' => 'users',
    ],
    'sessions' => ['user_id' => 'users'],
];

$identityMaps = [];

usort($tables, static function (string $left, string $right) use ($preferredOrder): int {
    $leftIndex = array_search($left, $preferredOrder, true);
    $rightIndex = array_search($right, $preferredOrder, true);

    $leftIndex = $leftIndex === false ? PHP_INT_MAX : $leftIndex;
    $rightIndex = $rightIndex === false ? PHP_INT_MAX : $rightIndex;

    return $leftIndex <=> $rightIndex ?: strcmp($left, $right);
});

$mysql->exec('SET FOREIGN_KEY_CHECKS = 0');
$mysql->beginTransaction();

try {
    foreach ($tables as $table) {
        $mysql->exec("DELETE FROM `{$table}`");
    }

    $summary = [];
    $mergedSummary = [];

    foreach ($tables as $table) {
        $columnRows = $sqlite->query("PRAGMA table_info('{$table}')")->fetchAll();
        $columns = array_map(static fn (array $row): string => (string) $row['name'], $columnRows);

        if ($columns === []) {
            $summary[$table] = 0;
            continue;
        }

        $placeholders = implode(', ', array_fill(0, count($columns), '?'));
        $quotedColumns = mysqlIdentifierList($columns);
        $insert = $mysql->prepare("INSERT INTO `{$table}` ({$quotedColumns}) VALUES ({$placeholders})");
        $config = $tableConfigs[$table] ?? null;

        $count = 0;
        $select = $sqlite->query("SELECT * FROM '{$table}'");
        while (($row = $select->fetch(PDO::FETCH_ASSOC)) !== false) {
            if (isset($foreignKeyMaps[$table])) {
                foreach ($foreignKeyMaps[$table] as $column => $referenceTable) {
                    if (array_key_exists($column, $row) && $row[$column] !== null && isset($identityMaps[$referenceTable][(string) $row[$column]])) {
                        $row[$column] = $identityMaps[$referenceTable][(string) $row[$column]];
                    }
                }
            }

            if ($table === 'documents' && isset($row['documentable_type'], $row['documentable_id']) && $row['documentable_id'] !== null) {
                $documentableTable = match ($row['documentable_type']) {
                    'App\\Models\\Vehicle' => 'vehicles',
                    'App\\Models\\Vessel' => 'vessels',
                    default => 'people',
                };

                if (isset($identityMaps[$documentableTable][(string) $row['documentable_id']])) {
                    $row['documentable_id'] = $identityMaps[$documentableTable][(string) $row['documentable_id']];
                }
            }

            if ($table === 'personal_access_tokens' && isset($row['tokenable_type'], $row['tokenable_id']) && $row['tokenable_id'] !== null) {
                if ($row['tokenable_type'] === 'App\\Models\\User' && isset($identityMaps['users'][(string) $row['tokenable_id']])) {
                    $row['tokenable_id'] = $identityMaps['users'][(string) $row['tokenable_id']];
                }
            }

            $values = [];
            foreach ($columns as $column) {
                $values[] = $row[$column];
            }

            try {
                $insert->execute($values);
            } catch (PDOException $exception) {
                $isDuplicate = str_contains($exception->getMessage(), '1062 Duplicate entry');
                if (!$isDuplicate || !$config) {
                    throw $exception;
                }

                $primaryKey = $config['primary_key'];
                $uniqueKey = $config['unique_key'];
                $sourceId = $row[$primaryKey] ?? null;
                $uniqueValue = $row[$uniqueKey] ?? null;

                if ($sourceId === null || $uniqueValue === null || $uniqueValue === '') {
                    throw $exception;
                }

                $lookup = $mysql->prepare("SELECT `{$primaryKey}` FROM `{$table}` WHERE `{$uniqueKey}` = ? LIMIT 1");
                $lookup->execute([$uniqueValue]);
                $targetId = $lookup->fetchColumn();

                if ($targetId === false) {
                    throw $exception;
                }

                $identityMaps[$table][(string) $sourceId] = (int) $targetId;
                $mergedSummary[$table] = ($mergedSummary[$table] ?? 0) + 1;
                $count++;
                continue;
            }

            if ($config && isset($row[$config['primary_key']])) {
                $identityMaps[$table][(string) $row[$config['primary_key']]] = (int) $row[$config['primary_key']];
            }

            $count++;
        }

        $summary[$table] = $count;
    }

    $mysql->commit();
    $mysql->exec('SET FOREIGN_KEY_CHECKS = 1');

    echo json_encode([
        'copied_rows' => $summary,
        'merged_duplicates' => $mergedSummary,
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;
} catch (Throwable $exception) {
    $mysql->rollBack();
    $mysql->exec('SET FOREIGN_KEY_CHECKS = 1');
    fwrite(STDERR, 'Migracion fallida: ' . $exception->getMessage() . PHP_EOL);
    exit(1);
}
