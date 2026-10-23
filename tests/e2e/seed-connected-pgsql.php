<?php

declare(strict_types=1);

// Connected /hrm/ staging smoke only: strictly isolated, disposable PostgreSQL.
// No seeding against a customer server or a non-CI database is permitted.
require __DIR__.'/../../backend/vendor/autoload.php';
$app = require __DIR__.'/../../backend/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$db = config('database.default');
$database = config('database.connections.pgsql.database');
if (getenv('GITHUB_ACTIONS') !== 'true'
    || !app()->environment('testing')
    || $db !== 'pgsql'
    || $database !== 'hrm_connected_ci'
    || config('database.connections.pgsql.host') !== '127.0.0.1') {
    throw new RuntimeException('Refusing synthetic seed outside isolated CI PostgreSQL database.');
}

$company = '11111111-1111-4111-8111-111111111111';
$department = '33333333-3333-4333-8333-333333333333';
$position = '66666666-6666-4666-8666-666666666666';
$employee = '77777777-7777-4777-8777-777777777777';

\Illuminate\Support\Facades\DB::transaction(static function () use ($company, $department, $position, $employee): void {
    $admin = \App\Models\User::query()->create([
        'name' => 'Synthetic Connected HR Admin',
        'email' => 'connected-admin@example.test',
        'password' => \Illuminate\Support\Facades\Hash::make('Connected-PG-CI-Only!2026'),
        'account_status' => 'active',
    ]);
    $member = \App\Models\User::query()->create([
        'name' => 'Synthetic Connected Employee',
        'email' => 'connected-employee@example.test',
        'password' => \Illuminate\Support\Facades\Hash::make('Connected-Staff-CI-Only!2026'),
        'account_status' => 'active',
    ]);

    \Illuminate\Support\Facades\DB::table('companies')->insert([
        'id' => $company, 'name' => 'Isolated PostgreSQL HRM Company',
    ]);
    \Illuminate\Support\Facades\DB::table('company_user_roles')->insert([
        ['company_id' => $company, 'user_id' => $admin->id, 'role_code' => 'company_admin'],
        ['company_id' => $company, 'user_id' => $member->id, 'role_code' => 'employee'],
    ]);
    \Illuminate\Support\Facades\DB::table('departments')->insert([
        'id' => $department, 'company_id' => $company, 'parent_id' => null, 'name' => 'Synthetic Production Team',
    ]);
    \Illuminate\Support\Facades\DB::table('positions')->insert([
        'id' => $position, 'company_id' => $company, 'name' => 'Test Engineer',
    ]);
    \Illuminate\Support\Facades\DB::table('employees')->insert([
        'id' => $employee,
        'company_id' => $company,
        'personnel_number' => 'PG-E2E-001',
        'last_name' => 'Connected',
        'first_name' => 'Person',
    ]);
    \Illuminate\Support\Facades\DB::table('employee_assignments')->insert([
        'id' => '88888888-8888-4888-8888-888888888888',
        'employee_id' => $employee,
        'department_id' => $department,
        'position_id' => $position,
        'valid_from' => '2026-01-01',
    ]);
});

echo "CI PostgreSQL identity, tenant and employee fixture ready.\n";
