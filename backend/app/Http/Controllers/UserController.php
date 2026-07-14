<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Gestión de usuarios de la organización (solo rol admin).
 */
class UserController extends Controller
{
    public function index()
    {
        $query = User::query()
            ->where('tenant_id', TenantContext::id())
            ->orderBy('name');

        if (request('search')) {
            $search = trim((string) request('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return $query->paginate((int) request('per_page', 25));
    }

    public function store(Request $request)
    {
        $tenant = TenantContext::tenant();
        if (!$tenant) {
            return response()->json(['message' => 'Operación no disponible sin organización activa.'], 422);
        }

        $maxUsers = $tenant->effectiveMaxUsers();
        if ($maxUsers !== null) {
            $current = User::where('tenant_id', $tenant->id)->count();
            if ($current >= $maxUsers) {
                return response()->json([
                    'message' => "Su plan permite un máximo de {$maxUsers} usuarios. Actualice el plan para agregar más.",
                    'code' => 'USER_LIMIT_REACHED',
                ], 422);
            }
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(User::TENANT_ROLES)],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $user = new User($validated);
        $user->tenant_id = $tenant->id;
        $user->save();

        return response()->json($user, 201);
    }

    public function show(User $user)
    {
        $this->assertSameTenant($user);

        return $user;
    }

    public function update(Request $request, User $user)
    {
        $this->assertSameTenant($user);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['required', Rule::in(User::TENANT_ROLES)],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if ($user->id === $request->user()->id) {
            if ($validated['role'] !== $user->role) {
                return response()->json(['message' => 'No puede cambiar su propio rol.'], 422);
            }
            if (array_key_exists('is_active', $validated) && $validated['is_active'] === false) {
                return response()->json(['message' => 'No puede deshabilitar su propio usuario.'], 422);
            }
        }

        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        $user->update($validated);

        return $user;
    }

    public function destroy(Request $request, User $user)
    {
        $this->assertSameTenant($user);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'No puede eliminar su propio usuario.'], 422);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'OK']);
    }

    private function assertSameTenant(User $user): void
    {
        if (TenantContext::id() === null || $user->tenant_id !== TenantContext::id()) {
            abort(404);
        }
    }
}
