<?php

declare(strict_types=1);

// This is for an ephemeral CI SQLite database only. It creates no real users.
// No registration or impersonation routes are exposed to the HTTP application.
require __DIR__.'/../../backend/vendor/autoload.php';

$app = require __DIR__.'/../../backend/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

if (app()->environment('production') || !str_contains((string) config('database.connections.sqlite.database'), 'browser-e2e.sqlite')) {
    throw new RuntimeException('Refusing to provision synthetic user outside isolated browser E2E database.');
}

\App\Models\User::query()->updateOrCreate(
    ['email' => 'synthetic-e2e@example.test'],
    [
        'name' => 'Synthetic HR E2E',
        'password' => \Illuminate\Support\Facades\Hash::make('SyntheticE2E-Only!2026'),
    ],
);

echo "Synthetic browser test identity provisioned.\n";
