<?php

namespace App\Models\Concerns;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Aislamiento por tenant: filtra toda consulta por el tenant activo
 * y asigna tenant_id automáticamente al crear registros.
 * Sin tenant en contexto (super_admin) no se aplica filtro.
 */
trait BelongsToTenant
{
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $query) {
            $tenantId = TenantContext::id();
            if ($tenantId !== null) {
                $query->where($query->getModel()->getTable() . '.tenant_id', $tenantId);
            }
        });

        static::creating(function (Model $model) {
            if (!$model->getAttribute('tenant_id') && TenantContext::id() !== null) {
                $model->setAttribute('tenant_id', TenantContext::id());
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
