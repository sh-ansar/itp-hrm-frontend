<?php

declare(strict_types=1);

use App\Domain\Identity\AccountState;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Password;

$backend = dirname(__DIR__, 2).DIRECTORY_SEPARATOR.'backend';
require $backend.DIRECTORY_SEPARATOR.'vendor'.DIRECTORY_SEPARATOR.'autoload.php';

/** @var \Illuminate\Foundation\Application $app */
$app = require $backend.DIRECTORY_SEPARATOR.'bootstrap'.DIRECTORY_SEPARATOR.'app.php';
$app->make(Kernel::class)->bootstrap();

$email = mb_strtolower(trim((string) ($argv[1] ?? '')));
if ($email === '') {
    fwrite(STDERR, "Synthetic CI email is required.\n");
    exit(2);
}

$user = User::query()->where('email', $email)->first();
if (!$user || $user->account_status !== AccountState::Active) {
    fwrite(STDERR, "Synthetic active CI account was not found.\n");
    exit(3);
}

$token = Password::broker('users')->createToken($user);
if (!is_string($token) || $token === '') {
    fwrite(STDERR, "Could not create synthetic reset token.\n");
    exit(4);
}

// CI-only, short-lived token for the disposable SQLite database. Never logs a password.
fwrite(STDOUT, $token);
