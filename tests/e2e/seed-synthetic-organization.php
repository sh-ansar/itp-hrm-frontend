<?php
declare(strict_types=1);
require __DIR__.'/../../backend/vendor/autoload.php';
$app = require __DIR__.'/../../backend/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (app()->environment('production') || !str_contains((string) config('database.connections.sqlite.database'), 'browser-e2e.sqlite')) {
    throw new RuntimeException('Synthetic organization seed must run only in browser E2E SQLite.');
}
$db = \Illuminate\Support\Facades\DB::table('companies');
$user = \App\Models\User::query()->where('email', 'synthetic-e2e@example.test')->firstOrFail();
$a = '11111111-1111-4111-8111-111111111111';
$b = '22222222-2222-4222-8222-222222222222';
$db->insert([['id'=>$a,'name'=>'Test Company Visible'],['id'=>$b,'name'=>'Test Company Hidden']]);
\Illuminate\Support\Facades\DB::table('company_user_roles')->insert([
    'company_id'=>$a,'user_id'=>$user->id,'role_code'=>'hr_specialist',
]);
\Illuminate\Support\Facades\DB::table('departments')->insert([
    ['id'=>'33333333-3333-4333-8333-333333333333','company_id'=>$a,'name'=>'Visible Finance'],
    ['id'=>'44444444-4444-4444-8444-444444444444','company_id'=>$b,'name'=>'Hidden Department'],
    ['id'=>'55555555-5555-4555-8555-555555555555','company_id'=>$a,'parent_id'=>'33333333-3333-4333-8333-333333333333','name'=>'Visible Finance Child'],
]);
echo "Synthetic isolated organizational fixtures provisioned.\n";
