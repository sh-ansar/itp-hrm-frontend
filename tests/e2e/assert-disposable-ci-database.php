<?php

declare(strict_types=1);

/**
 * Safety gate for SYNTHETIC fixture scripts only.
 *
 * PostgreSQL is accepted only on an ephemeral GitHub Actions service with an
 * exact database/user/loopback match and a dedicated opt-in marker. Refuse every
 * operational or shared database even when APP_ENV was accidentally set to test.
 */
function assertDisposableBrowserDatabase(): void
{
    if (app()->environment('production')) {
        throw new RuntimeException('Refusing synthetic HRM fixtures in production.');
    }

    $driver = (string) config('database.default');
    if ($driver === 'sqlite'
        && str_contains((string) config('database.connections.sqlite.database'), 'browser-e2e.sqlite')) {
        return;
    }

    if ($driver !== 'pgsql'
        || getenv('GITHUB_ACTIONS') !== 'true'
        || getenv('HRM_DISPOSABLE_BROWSER_POSTGRES') !== 'isolated-pg16'
        || (string) config('database.connections.pgsql.host') !== '127.0.0.1'
        || (string) config('database.connections.pgsql.port') !== '5432'
        || (string) config('database.connections.pgsql.database') !== 'itp_hrm_browser_ci'
        || (string) config('database.connections.pgsql.username') !== 'hrm_browser_ci'
        || (string) config('database.connections.pgsql.search_path') !== 'hrm') {
        throw new RuntimeException('Synthetic fixtures require an exact disposable CI database identity.');
    }

    // Fail closed if a network redirect, connection override or PostgreSQL
    // environment alias silently points somewhere else.
    $row = \Illuminate\Support\Facades\DB::selectOne(
        'select current_database() as database_name, current_user as user_name, '.
        'inet_server_addr()::text as address, inet_server_port() as port'
    );
    if (!$row
        || $row->database_name !== 'itp_hrm_browser_ci'
        || $row->user_name !== 'hrm_browser_ci'
        || $row->address !== '127.0.0.1'
        || (int) $row->port !== 5432) {
        throw new RuntimeException('Connected PostgreSQL is not the ephemeral HRM browser CI service.');
    }
}
