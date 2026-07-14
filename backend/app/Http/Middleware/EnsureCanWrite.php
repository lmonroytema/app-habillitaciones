<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Los usuarios con rol viewer solo pueden consultar:
 * se bloquea cualquier método que modifique datos.
 */
class EnsureCanWrite
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && !$user->canWrite() && !$request->isMethodSafe()) {
            return response()->json(['message' => 'Su rol es de solo consulta.'], 403);
        }

        return $next($request);
    }
}
