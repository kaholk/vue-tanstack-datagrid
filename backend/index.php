<?php

declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody ?: '{}', true);

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON payload'], JSON_THROW_ON_ERROR);
    exit;
}

$pageIndex = max(0, (int) ($payload['pageIndex'] ?? 0));
$pageSize = max(1, min(500, (int) ($payload['pageSize'] ?? 100)));
$sorting = is_array($payload['sorting'] ?? null) ? $payload['sorting'] : [];
$filters = is_array($payload['filters'] ?? null) ? $payload['filters'] : [];
$search = trim((string) ($payload['search'] ?? ''));
$includeColumns = array_values(array_filter(
    is_array($payload['include_columns'] ?? null) ? $payload['include_columns'] : [],
    static fn (mixed $value): bool => is_string($value) && $value !== ''
));

$statuses = ['active', 'active1', 'active2', 'active3', 'active4', 'inactive', 'pending', 'new', 'qualified', 'proposal'];
$plans = ['free', 'starter', 'growth', 'enterprise'];
$countries = ['Poland', 'Germany', 'France', 'Spain', 'Italy', 'Sweden', 'USA', 'Canada'];
$cities = ['Warsaw', 'Berlin', 'Paris', 'Madrid', 'Rome', 'Stockholm', 'Chicago', 'Toronto'];
$departments = ['Sales', 'Support', 'Finance', 'Operations', 'Marketing', 'HR', 'Product'];
$firstNames = ['Anna', 'Jan', 'Maria', 'John', 'Emma', 'Luca', 'Sara', 'Mila', 'Noah', 'Zofia'];
$lastNames = ['Nowak', 'Smith', 'Garcia', 'Muller', 'Martin', 'Kowalski', 'Rossi', 'Lopez'];
$companies = ['Northwind', 'Acme', 'Orbit', 'PixelForge', 'BluePeak', 'Solaris', 'WaveCore'];

$dataset = [];
$datasetSize = 20000;
$extraColumnNames = [];

for ($columnIndex = 1; $columnIndex <= 30; $columnIndex++) {
    $extraColumnNames[] = sprintf('extraCol%02d', $columnIndex);
}

for ($index = 1; $index <= $datasetSize; $index++) {
    $firstName = $firstNames[$index % count($firstNames)];
    $lastName = $lastNames[($index * 3) % count($lastNames)];
    $country = $countries[($index * 5) % count($countries)];
    $city = $cities[($index * 7) % count($cities)];
    $company = $companies[($index * 11) % count($companies)];
    $plan = $plans[($index * 13) % count($plans)];
    $status = $statuses[($index * 17) % count($statuses)];
    $department = $departments[($index * 19) % count($departments)];
    $visits = ($index * 23) % 1000;
    $progress = ($index * 29) % 100;
    $score = ($index * 31) % 100;
    $balance = round((($index * 37) % 50000) / 10, 2);
    $createdAt = date('Y-m-d', strtotime(sprintf('-%d days', $index % 720)));

    $row = [
        'id' => $index,
        'customerCode' => sprintf('CUS-%05d', $index),
        'firstName' => $firstName,
        'lastName' => $lastName,
        'email' => strtolower($firstName . '.' . $lastName . $index . '@demo.local'),
        'company' => $company,
        'city' => $city,
        'country' => $country,
        'department' => $department,
        'plan' => $plan,
        'status' => $status,
        'visits' => $visits,
        'progress' => $progress,
        'score' => $score,
        'balance' => $balance,
        'createdAt' => $createdAt,
    ];

    foreach ($extraColumnNames as $extraIndex => $columnName) {
        $row[$columnName] = sprintf('V%02d-%04d', $extraIndex + 1, (($index * ($extraIndex + 3)) % 10000));
    }

    $dataset[] = $row;
}

$searchableFields = [
    'id',
    'customerCode',
    'firstName',
    'lastName',
    'email',
    'company',
    'city',
    'country',
    'department',
    'plan',
    'status',
    ...$extraColumnNames,
];

if ($search !== '') {
    $needle = mb_strtolower($search);
    $dataset = array_values(array_filter(
        $dataset,
        static function (array $row) use ($needle, $searchableFields): bool {
            foreach ($searchableFields as $field) {
                if (str_contains(mb_strtolower((string) $row[$field]), $needle)) {
                    return true;
                }
            }

            return false;
        }
    ));
}

foreach ($filters as $filter) {
    if (!is_array($filter)) {
        continue;
    }

    $id = (string) ($filter['id'] ?? '');
    $rawValue = $filter['value'] ?? '';

    if ($id === '') {
        continue;
    }

    if (is_array($rawValue)) {
        $needles = array_values(array_filter(
            array_map(
                static fn (mixed $value): string => mb_strtolower(trim((string) $value)),
                $rawValue
            ),
            static fn (string $value): bool => $value !== ''
        ));

        if ($needles === []) {
            continue;
        }

        $needleLookup = array_flip($needles);
        $dataset = array_values(array_filter(
            $dataset,
            static function (array $row) use ($id, $needleLookup): bool {
                if (!array_key_exists($id, $row)) {
                    return true;
                }

                return isset($needleLookup[mb_strtolower((string) $row[$id])]);
            }
        ));

        continue;
    }

    $value = trim((string) $rawValue);

    if ($value === '') {
        continue;
    }

    $needle = mb_strtolower($value);
    $dataset = array_values(array_filter(
        $dataset,
        static function (array $row) use ($id, $needle): bool {
            if (!array_key_exists($id, $row)) {
                return true;
            }

            return str_contains(mb_strtolower((string) $row[$id]), $needle);
        }
    ));
}

if ($sorting !== []) {
    usort(
        $dataset,
        static function (array $left, array $right) use ($sorting): int {
            foreach ($sorting as $sort) {
                if (!is_array($sort)) {
                    continue;
                }

                $field = (string) ($sort['id'] ?? '');
                $desc = (bool) ($sort['desc'] ?? false);

                if ($field === '' || !array_key_exists($field, $left) || !array_key_exists($field, $right)) {
                    continue;
                }

                if ($left[$field] === $right[$field]) {
                    continue;
                }

                $result = $left[$field] <=> $right[$field];
                return $desc ? -$result : $result;
            }

            return 0;
        }
    );
}

$totalRows = count($dataset);
$pageCount = (int) ceil($totalRows / $pageSize);
$offset = $pageIndex * $pageSize;
$rows = array_slice($dataset, $offset, $pageSize);

if ($includeColumns !== []) {
    $allowedColumns = array_flip(array_keys($dataset[0] ?? []));
    $requestedColumns = ['id'];

    foreach ($includeColumns as $columnName) {
        if (isset($allowedColumns[$columnName])) {
            $requestedColumns[] = $columnName;
        }
    }

    $requestedColumns = array_values(array_unique($requestedColumns));

    $rows = array_map(
        static function (array $row) use ($requestedColumns): array {
            $projected = [];

            foreach ($requestedColumns as $columnName) {
                if (array_key_exists($columnName, $row)) {
                    $projected[$columnName] = $row[$columnName];
                }
            }

            return $projected;
        },
        $rows
    );
}

echo json_encode(
    [
        'rows' => $rows,
        'totalRows' => $totalRows,
        'pageCount' => $pageCount,
        'meta' => [
            'datasetSize' => $datasetSize,
            'pageIndex' => $pageIndex,
            'pageSize' => $pageSize,
        ],
    ],
    JSON_THROW_ON_ERROR
);
