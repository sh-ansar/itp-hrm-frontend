<?php
declare(strict_types=1);
require __DIR__.'/../../backend/vendor/autoload.php';
$app = require __DIR__.'/../../backend/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
require __DIR__.'/assert-disposable-ci-database.php';
assertDisposableBrowserDatabase();$company = '11111111-1111-4111-8111-111111111111';
echo json_encode([
    'db_is_fixture' => true,
    'visible_company_count' => \Illuminate\Support\Facades\DB::table('companies')->where('id', $company)->count(),
    'visible_department_count' => \Illuminate\Support\Facades\DB::table('departments')->where('company_id', $company)->count(),
    'membership_count' => \Illuminate\Support\Facades\DB::table('company_user_roles')->where('company_id', $company)->count(),
], JSON_THROW_ON_ERROR)."\n";
