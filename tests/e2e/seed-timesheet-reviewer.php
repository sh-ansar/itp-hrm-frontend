<?php

declare(strict_types=1);
require __DIR__.'/../../backend/vendor/autoload.php';
$app = require __DIR__.'/../../backend/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
require __DIR__.'/assert-disposable-ci-database.php';
assertDisposableBrowserDatabase();
if (!config('hrm.worktime_period_approvals_enabled')) {
    throw new RuntimeException('Period review fixtures require the explicit isolated test flag.');
}
$company = '11111111-1111-4111-8111-111111111111';
if (!\Illuminate\Support\Facades\DB::table('companies')->where('id', $company)->exists()) {
    throw new RuntimeException('Synthetic organization must be seeded first.');
}
$user = \App\Models\User::query()->updateOrCreate(
    ['email' => 'synthetic-period-reviewer@example.test'],
    ['name' => 'Synthetic Period Reviewer', 'password' => \Illuminate\Support\Facades\Hash::make('SyntheticE2E-Only!2026')],
);
\Illuminate\Support\Facades\DB::table('company_user_roles')->updateOrInsert(
    ['company_id' => $company, 'user_id' => $user->id, 'role_code' => 'company_admin'],
    [],
);
echo "Synthetic period reviewer provisioned.\n";
