<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();
        if (!$user || !Hash::check($validated['password'], $user->password)) {
            return response()->json(['message' => 'Credenciales inválidas.'], 422);
        }

        if (!$user->is_active) {
            return response()->json(['message' => 'Usuario deshabilitado. Contacte al administrador.'], 403);
        }

        $tenant = $user->tenant;

        if (!$user->isSuperAdmin()) {
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
        }

        $token = $user->createToken($validated['device_name'] ?? 'web')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->userPayload($user),
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        Password::sendResetLink([
            'email' => $validated['email'],
        ]);

        return response()->json([
            'message' => 'Si el correo existe en el sistema, se enviaron las instrucciones de recuperación.',
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'user' => $this->userPayload($request->user()),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()?->currentAccessToken()?->delete();
        return response()->json(['message' => 'OK']);
    }

    private function userPayload(User $user): array
    {
        $tenant = $user->tenant;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'tenant' => $tenant ? [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'plan' => $tenant->plan,
                'status' => $tenant->status,
                'trial_ends_at' => $tenant->trial_ends_at?->toDateString(),
                'max_users' => $tenant->effectiveMaxUsers(),
            ] : null,
        ];
    }
}
