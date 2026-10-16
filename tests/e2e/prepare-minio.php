<?php

declare(strict_types=1);

// Ephemeral GitHub Actions fixture only. Never touches production MinIO.
if (getenv('CI') !== 'true') {
    fwrite(STDERR, "MinIO E2E bootstrap is only allowed in CI.\n");
    exit(2);
}

$endpoint = (string) getenv('MINIO_ENDPOINT');
$bucket = (string) getenv('MINIO_BUCKET');
$key = (string) getenv('MINIO_ACCESS_KEY');
$secret = (string) getenv('MINIO_SECRET_KEY');

if ($endpoint !== 'http://127.0.0.1:9000'
    || !preg_match('/^hrm-ci-[a-z0-9-]+$/', $bucket)
    || strlen($key) < 3
    || strlen($secret) < 12) {
    fwrite(STDERR, "Refusing non-isolated MinIO E2E endpoint or invalid test settings.\n");
    exit(2);
}

require __DIR__.'/../../backend/vendor/autoload.php';

try {
    $s3 = new Aws\S3\S3Client([
        'version' => 'latest',
        'region' => (string) (getenv('MINIO_REGION') ?: 'us-east-1'),
        'endpoint' => $endpoint,
        'use_path_style_endpoint' => true,
        'credentials' => ['key' => $key, 'secret' => $secret],
        'http' => ['connect_timeout' => 3, 'timeout' => 10],
    ]);

    $s3->createBucket(['Bucket' => $bucket]);
    $s3->headBucket(['Bucket' => $bucket]);

    // No bucket policy is added: anonymous listing and downloads remain denied.
    echo "CI-only private MinIO bucket is ready.\n";
} catch (Throwable $exception) {
    fwrite(STDERR, 'Ephemeral MinIO setup failed ('.get_class($exception).").\n");
    exit(1);
}
