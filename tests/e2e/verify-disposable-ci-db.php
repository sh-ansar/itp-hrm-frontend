<?php

declare(strict_types=1);

// Executable preflight. Call before any migrations or fixture writes in CI.
require __DIR__.'/../../backend/vendor/autoload.php';
$app = require __DIR__.'/../../backend/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
require __DIR__.'/assert-disposable-ci-database.php';
assertDisposableBrowserDatabase();
echo "Disposable browser database identity verified.\n";
