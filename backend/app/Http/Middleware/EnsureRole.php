<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restringe una ruta a uno o más roles: ->middleware('role:admin,super_admin').
 * Un super_admin siempre pasa.
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        if ($user->isSuperAdmin() || in_array($user->role, $roles, true)) {
            return $next($request);
        }

        return response()->json(['message' => 'No tiene permisos para esta operación.'], 403);
    }
}
