<?php

declare(strict_types=1);

// This script must never run on a shared/production database.
// Only the exact disposable GitHub Actions PostgreSQL browser service is valid.
require __DIR__.'/../../backend/vendor/autoload.php';
$app = require __DIR__.'/../../backend/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
require __DIR__.'/assert-disposable-ci-database.php';
assertDisposableBrowserDatabase();
if (config('database.default') !== 'pgsql') {
    throw new RuntimeException('This is a PostgreSQL-only CI schema initialization.');
}
\Illuminate\Support\Facades\DB::statement('CREATE SCHEMA IF NOT EXISTS hrm');
echo "Disposable isolated HRM PostgreSQL schema ready.\n";
