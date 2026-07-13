<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class SharePointClient
{
    public function isEnabled(): bool
    {
        return config('services.sharepoint.driver') === 'sharepoint';
    }

    public function upload(string $relativePath, string $originalFilename, string $mimeType, string $localFilePath, int $sizeBytes): array
    {
        $driveId = (string) config('services.sharepoint.drive_id');
        $baseFolder = trim((string) config('services.sharepoint.base_folder'), '/');
        $path = $baseFolder !== '' ? ($baseFolder . '/' . ltrim($relativePath, '/')) : ltrim($relativePath, '/');

        $safeName = $this->sanitizeFileName($originalFilename);
        $uniqueName = Str::uuid()->toString() . '_' . $safeName;
        $finalPath = $this->replaceFileNameInPath($path, $uniqueName);

        $simpleMaxMb = (int) config('services.sharepoint.simple_upload_max_mb', 4);
        $simpleMaxBytes = $simpleMaxMb * 1024 * 1024;

        if ($sizeBytes <= $simpleMaxBytes) {
            return $this->simpleUpload($driveId, $finalPath, $mimeType, $localFilePath);
        }

        return $this->uploadSession($driveId, $finalPath, $mimeType, $localFilePath, $sizeBytes);
    }

    public function deleteItem(string $driveId, string $itemId): void
    {
        $this->graph()
            ->delete("https://graph.microsoft.com/v1.0/drives/{$driveId}/items/{$itemId}");
    }

    public function downloadToTempFile(string $driveId, string $itemId, string $fileNameHint): string
    {
        $tmpDir = storage_path('app/tmp');
        if (!is_dir($tmpDir)) {
            @mkdir($tmpDir, 0755, true);
        }

        $fileName = Str::uuid()->toString() . '_' . $this->sanitizeFileName($fileNameHint);
        $tmpPath = $tmpDir . DIRECTORY_SEPARATOR . $fileName;

        $res = $this->graph()
            ->withOptions(['allow_redirects' => true])
            ->sink($tmpPath)
            ->get("https://graph.microsoft.com/v1.0/drives/{$driveId}/items/{$itemId}/content");

        if (!$res->successful()) {
            @unlink($tmpPath);
            abort(502, 'No se pudo descargar el archivo desde SharePoint.');
        }

        return $tmpPath;
    }

    private function graph(): PendingRequest
    {
        return Http::withToken($this->accessToken())
            ->acceptJson()
            ->timeout(60);
    }

    private function accessToken(): string
    {
        $tenant = (string) config('services.sharepoint.tenant_id');
        $clientId = (string) config('services.sharepoint.client_id');
        $clientSecret = (string) config('services.sharepoint.client_secret');

        if ($tenant === '' || $clientId === '' || $clientSecret === '') {
            abort(500, 'SharePoint no está configurado (tenant/client).');
        }

        $cacheKey = 'sharepoint_graph_access_token';

        return Cache::remember($cacheKey, now()->addMinutes(50), function () use ($tenant, $clientId, $clientSecret) {
            $tokenUrl = "https://login.microsoftonline.com/{$tenant}/oauth2/v2.0/token";

            $res = Http::asForm()
                ->timeout(30)
                ->post($tokenUrl, [
                    'client_id' => $clientId,
                    'client_secret' => $clientSecret,
                    'grant_type' => 'client_credentials',
                    'scope' => 'https://graph.microsoft.com/.default',
                ]);

            if (!$res->successful()) {
                abort(502, 'No se pudo obtener token de Microsoft Graph.');
            }

            $token = (string) ($res->json('access_token') ?? '');
            if ($token === '') {
                abort(502, 'Token de Microsoft Graph inválido.');
            }

            return $token;
        });
    }

    private function simpleUpload(string $driveId, string $path, string $mimeType, string $localFilePath): array
    {
        $stream = fopen($localFilePath, 'r');
        if ($stream === false) {
            abort(500, 'No se pudo leer el archivo local.');
        }

        try {
            $encodedPath = str_replace('%2F', '/', rawurlencode($path));
            $url = "https://graph.microsoft.com/v1.0/drives/{$driveId}/root:/{$encodedPath}:/content";

            $res = $this->graph()
                ->withBody($stream, $mimeType)
                ->put($url);

            if (!$res->successful()) {
                abort(502, 'No se pudo subir el archivo a SharePoint.');
            }

            return [
                'drive_id' => $driveId,
                'item_id' => (string) ($res->json('id') ?? ''),
                'web_url' => (string) ($res->json('webUrl') ?? ''),
                'path' => $path,
            ];
        } finally {
            fclose($stream);
        }
    }

    private function uploadSession(string $driveId, string $path, string $mimeType, string $localFilePath, int $sizeBytes): array
    {
        $encodedPath = str_replace('%2F', '/', rawurlencode($path));
        $createUrl = "https://graph.microsoft.com/v1.0/drives/{$driveId}/root:/{$encodedPath}:/createUploadSession";

        $createRes = $this->graph()->post($createUrl, [
            'item' => [
                '@microsoft.graph.conflictBehavior' => 'rename',
                'name' => basename($path),
            ],
        ]);

        if (!$createRes->successful()) {
            abort(502, 'No se pudo crear sesión de carga en SharePoint.');
        }

        $uploadUrl = (string) ($createRes->json('uploadUrl') ?? '');
        if ($uploadUrl === '') {
            abort(502, 'SharePoint no retornó uploadUrl.');
        }

        $chunkSize = 5 * 1024 * 1024;
        $handle = fopen($localFilePath, 'rb');
        if ($handle === false) {
            abort(500, 'No se pudo leer el archivo local.');
        }

        try {
            $offset = 0;
            $lastItem = null;

            while (!feof($handle)) {
                $data = fread($handle, $chunkSize);
                if ($data === false) {
                    abort(500, 'No se pudo leer el archivo local.');
                }

                $length = strlen($data);
                if ($length === 0) {
                    break;
                }

                $start = $offset;
                $end = $offset + $length - 1;
                $offset += $length;

                $res = Http::withHeaders([
                    'Content-Length' => (string) $length,
                    'Content-Range' => "bytes {$start}-{$end}/{$sizeBytes}",
                    'Content-Type' => $mimeType,
                ])
                    ->timeout(120)
                    ->put($uploadUrl, $data);

                if ($res->status() === 202) {
                    continue;
                }

                if ($res->successful()) {
                    $lastItem = $res->json();
                    break;
                }

                abort(502, 'Falló la carga por partes a SharePoint.');
            }

            if (!$lastItem || !is_array($lastItem)) {
                abort(502, 'SharePoint no retornó metadata final de carga.');
            }

            return [
                'drive_id' => $driveId,
                'item_id' => (string) ($lastItem['id'] ?? ''),
                'web_url' => (string) ($lastItem['webUrl'] ?? ''),
                'path' => $path,
            ];
        } finally {
            fclose($handle);
        }
    }

    private function sanitizeFileName(string $name): string
    {
        $name = trim($name);
        $name = str_replace(["\r", "\n"], ' ', $name);
        $name = preg_replace('/[\\\\\\/\\:\\*\\?\\"\\<\\>\\|]+/', '_', $name) ?? $name;
        $name = preg_replace('/\\s+/', ' ', $name) ?? $name;
        $name = trim($name);

        return $name === '' ? 'archivo' : $name;
    }

    private function replaceFileNameInPath(string $path, string $fileName): string
    {
        $dir = trim(dirname($path), '.');
        if ($dir === '' || $dir === '.') {
            return $fileName;
        }
        return rtrim($dir, '/') . '/' . $fileName;
    }
}

