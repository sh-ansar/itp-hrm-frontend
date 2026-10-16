<?php
// Additional identities and records exist only in the disposable browser fixture.
require __DIR__.'/../../backend/vendor/autoload.php';
$app = require __DIR__.'/../../backend/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (app()->environment('production') || config('database.default') !== 'sqlite'
    || !str_contains((string) config('database.connections.sqlite.database'), 'browser-e2e.sqlite')
    || !config('hrm.role_management_enabled')) {
    throw new RuntimeException('Role scenario seed requires the isolated role-enabled browser database.');
}
$company = '11111111-1111-4111-8111-111111111111';
foreach (['manager' => 'department_manager', 'employee' => 'employee'] as $name => $role) {
    $user = \App\Models\User::query()->updateOrCreate(['email' => "synthetic-{$name}@example.test"], [
        'name' => 'Synthetic '.ucfirst($name).' User',
        'password' => \Illuminate\Support\Facades\Hash::make('SyntheticRole-Only!2026'),
    ]);
    \Illuminate\Support\Facades\DB::table('company_user_roles')->updateOrInsert([
        'company_id' => $company, 'user_id' => $user->id,
    ], ['role_code' => $role]);
    if ($role === 'department_manager') {
        \Illuminate\Support\Facades\DB::table('department_access_scopes')->insert([
            'company_id' => $company, 'user_id' => $user->id,
            'department_id' => '33333333-3333-4333-8333-333333333333',
        ]);
    }
}
\Illuminate\Support\Facades\DB::table('employees')->insert([
    'id' => '99999999-9999-4999-8999-999999999999', 'company_id' => $company,
    'personnel_number' => 'RESTRICTED-002', 'last_name' => 'Restricted', 'first_name' => 'Staff',
]);
\Illuminate\Support\Facades\DB::table('employee_assignments')->insert([
    'id' => 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'employee_id' => '99999999-9999-4999-8999-999999999999',
    'department_id' => '55555555-5555-4555-8555-555555555555',
    'position_id' => '66666666-6666-4666-8666-666666666666', 'valid_from' => '2026-01-01',
]);
echo "Isolated four-role scenario fixture ready.\n";
