<?php

namespace App\Support;

use App\Models\Tenant;

/**
 * Contexto del tenant activo durante la petición.
 * Lo establece el middleware IdentifyTenant; los modelos con
 * BelongsToTenant lo usan para filtrar y asignar tenant_id.
 */
class TenantContext
{
    private static ?Tenant $tenant = null;

    public static function set(?Tenant $tenant): void
    {
        self::$tenant = $tenant;
    }

    public static function tenant(): ?Tenant
    {
        return self::$tenant;
    }

    public static function id(): ?int
    {
        return self::$tenant?->id;
    }

    public static function clear(): void
    {
        self::$tenant = null;
    }
}
