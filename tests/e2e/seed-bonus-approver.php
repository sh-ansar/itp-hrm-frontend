<?php

declare(strict_types=1);

// Only executed after migrate:fresh on an disposable CI browser database.
require __DIR__.'/../../backend/vendor/autoload.php';
$app = require __DIR__.'/../../backend/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

require __DIR__.'/assert-disposable-ci-database.php';
assertDisposableBrowserDatabase();
if (!(bool) config('hrm.bonus_writes_enabled')) {
    throw new RuntimeException('Synthetic bonus approver requires HRM bonus writes enabled.');
}
$company = '11111111-1111-4111-8111-111111111111';
if (! \Illuminate\Support\Facades\DB::table('companies')->where('id', $company)->exists()) {
    throw new RuntimeException('Synthetic test company not found.');
}
$user = \App\Models\User::query()->updateOrCreate(
    ['email' => 'synthetic-bonus-approver@example.test'],
    [
        'name' => 'Synthetic Bonus Approver',
        'password' => \Illuminate\Support\Facades\Hash::make('SyntheticBonusApproval-Only!2026'),
    ],
);
\Illuminate\Support\Facades\DB::table('company_user_roles')->updateOrInsert(
    ['company_id' => $company, 'user_id' => $user->id],
    ['role_code' => 'company_admin'],
);

echo "Isolated bonus approver provisioned.\n";
