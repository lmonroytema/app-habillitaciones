<?php

namespace App\Http\Controllers;

use App\Support\TenantContext;
use Illuminate\Validation\Rules\Exists;
use Illuminate\Validation\Rules\Unique;
use Illuminate\Validation\Rule;

abstract class Controller
{
    /**
     * Regla exists limitada al tenant activo, para impedir referencias
     * cruzadas entre organizaciones (p. ej. asociar una persona a un
     * proyecto de otro cliente).
     */
    protected function tenantExists(string $table, string $column = 'id'): Exists
    {
        $rule = Rule::exists($table, $column);

        if (TenantContext::id() !== null) {
            $rule->where('tenant_id', TenantContext::id());
        }

        return $rule;
    }

    /**
     * Regla unique limitada al tenant activo: dos organizaciones distintas
     * pueden repetir códigos, placas o matrículas sin colisionar.
     */
    protected function tenantUnique(string $table, string $column, ?int $ignoreId = null): Unique
    {
        $rule = Rule::unique($table, $column);

        if (TenantContext::id() !== null) {
            $rule->where('tenant_id', TenantContext::id());
        }

        if ($ignoreId !== null) {
            $rule->ignore($ignoreId);
        }

        return $rule;
    }
}
