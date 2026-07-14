<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Establece el tenant activo a partir del usuario autenticado y
 * bloquea el acceso si la suscripción está suspendida o el trial venció.
 *
 * Un super_admin no pertenece a un tenant; puede inspeccionar uno
 * concreto enviando el encabezado X-Tenant-Id.
 */
class IdentifyTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        if (!$user->is_active) {
            return response()->json(['message' => 'Usuario deshabilitado.'], 403);
        }

        if ($user->isSuperAdmin()) {
            $tenant = null;
            if ($request->hasHeader('X-Tenant-Id')) {
                $tenant = Tenant::find((int) $request->header('X-Tenant-Id'));
                if (!$tenant) {
                    return response()->json(['message' => 'Tenant no encontrado.'], 404);
                }
            }
            TenantContext::set($tenant);

            return $next($request);
        }

        $tenant = $user->tenant;

        if (!$tenant) {
            return response()->json(['message' => 'Usuario sin organización asignada.'], 403);
        }

        if ($tenant->isSuspended()) {
            return response()->json([
                'message' => 'La suscripción de la organización está suspendida. Contacte al proveedor.',
                'code' => 'TENANT_SUSPENDED',
            ], 402);
        }

        if ($tenant->isTrialExpired()) {
            return response()->json([
                'message' => 'El período de prueba finalizó. Contrate un plan para continuar.',
                'code' => 'TRIAL_EXPIRED',
            ], 402);
        }

        TenantContext::set($tenant);

        return $next($request);
    }
}
