<?php
declare(strict_types=1);
require __DIR__.'/../../backend/vendor/autoload.php';
$app = require __DIR__.'/../../backend/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
require __DIR__.'/assert-disposable-ci-database.php';
assertDisposableBrowserDatabase();$db = \Illuminate\Support\Facades\DB::table('companies');
$user = \App\Models\User::query()->where('email', 'synthetic-e2e@example.test')->firstOrFail();
$a = '11111111-1111-4111-8111-111111111111';
$b = '22222222-2222-4222-8222-222222222222';
$db->insert([['id'=>$a,'name'=>'Test Company Visible'],['id'=>$b,'name'=>'Test Company Hidden']]);
\Illuminate\Support\Facades\DB::table('company_user_roles')->insert([
    'company_id'=>$a,'user_id'=>$user->id,'role_code'=>'hr_specialist',
]);
\Illuminate\Support\Facades\DB::table('departments')->insert([
    ['id'=>'33333333-3333-4333-8333-333333333333','company_id'=>$a,'parent_id'=>null,'name'=>'Visible Finance'],
    ['id'=>'44444444-4444-4444-8444-444444444444','company_id'=>$b,'parent_id'=>null,'name'=>'Hidden Department'],
    ['id'=>'55555555-5555-4555-8555-555555555555','company_id'=>$a,'parent_id'=>'33333333-3333-4333-8333-333333333333','name'=>'Visible Finance Child'],
]);
if (\Illuminate\Support\Facades\DB::table('departments')->where('company_id', $a)->count() !== 2) { throw new RuntimeException('Synthetic department seed was not persisted.'); }
\Illuminate\Support\Facades\DB::table('positions')->insert(['id'=>'66666666-6666-4666-8666-666666666666','company_id'=>$a,'name'=>'Test Engineer']);
\Illuminate\Support\Facades\DB::table('employees')->insert(['id'=>'77777777-7777-4777-8777-777777777777','company_id'=>$a,'personnel_number'=>'E2E-001','last_name'=>'Synthetic','first_name'=>'Employee']);
\Illuminate\Support\Facades\DB::table('employee_assignments')->insert(['id'=>'88888888-8888-4888-8888-888888888888','employee_id'=>'77777777-7777-4777-8777-777777777777','department_id'=>'33333333-3333-4333-8333-333333333333','position_id'=>'66666666-6666-4666-8666-666666666666','valid_from'=>'2026-01-01']);
$calendarDays = [];
$cursor = new DateTimeImmutable('2026-10-01');
$end = new DateTimeImmutable('2026-10-31');
while ($cursor <= $end) {
    $weekend = in_array((int) $cursor->format('N'), [6, 7], true);
    $calendarDays[] = [
        'id' => (string) \Illuminate\Support\Str::uuid(),
        'company_id' => $a,
        'work_date' => $cursor->format('Y-m-d'),
        'day_type' => $weekend ? 'weekend' : 'workday',
        'planned_minutes' => $weekend ? 0 : 480,
        'label' => $weekend ? 'Weekend' : null,
        'revision' => 1,
        'created_at' => now(),
        'updated_at' => now(),
    ];
    $cursor = $cursor->modify('+1 day');
}
\Illuminate\Support\Facades\DB::table('production_calendar_days')->insert($calendarDays);
\Illuminate\Support\Facades\DB::table('employee_training')->insert([
    ['id'=>'9a111111-1111-4111-8111-111111111111','employee_id'=>'77777777-7777-4777-8777-777777777777',
        'training_type'=>'seminar','training_mode'=>'remote','topic'=>'E2E Completed Safety','started_on'=>'2026-01-05','ended_on'=>'2026-01-08'],
    ['id'=>'9a222222-2222-4222-8222-222222222222','employee_id'=>'77777777-7777-4777-8777-777777777777',
        'training_type'=>'seminar','training_mode'=>'in_person','topic'=>'E2E Ongoing Leadership','started_on'=>'2026-01-01','ended_on'=>null],
    ['id'=>'9a333333-3333-4333-8333-333333333333','employee_id'=>'77777777-7777-4777-8777-777777777777',
        'training_type'=>'seminar','training_mode'=>'on_the_job','topic'=>'E2E Future Training','started_on'=>'2035-07-01','ended_on'=>null],
]);
\Illuminate\Support\Facades\DB::table('employee_reserve')->insert([
    ['id'=>'9b111111-1111-4111-8111-111111111111','employee_id'=>'77777777-7777-4777-8777-777777777777',
        'target_position'=>'E2E Lead Specialist','reserve_level'=>'senior','reserve_type'=>'internal',
        'joined_year'=>2026,'left_year'=>null,'notes'=>'PRIVATE E2E reserve assessment'],
    ['id'=>'9b222222-2222-4222-8222-222222222222','employee_id'=>'77777777-7777-4777-8777-777777777777',
        'target_position'=>'E2E Former Candidate','reserve_level'=>'middle','reserve_type'=>'internal',
        'joined_year'=>2024,'left_year'=>2025,'notes'=>null],
]);
echo "Synthetic isolated organizational fixtures provisioned.\n";
