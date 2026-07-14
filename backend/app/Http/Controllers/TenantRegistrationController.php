<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Alta autoservicio de una organización (tenant) en plan de prueba.
 */
class TenantRegistrationController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'organization_name' => ['required', 'string', 'max:255'],
            'ruc' => ['nullable', 'string', 'max:20'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        [$tenant, $user] = DB::transaction(function () use ($validated) {
            $tenant = Tenant::create([
                'name' => $validated['organization_name'],
                'slug' => $this->uniqueSlug($validated['organization_name']),
                'ruc' => $validated['ruc'] ?? null,
                'contact_email' => $validated['email'],
                'plan' => Tenant::PLAN_TRIAL,
                'status' => Tenant::STATUS_ACTIVE,
                'trial_ends_at' => now()->addDays(Tenant::TRIAL_DAYS)->toDateString(),
            ]);

            $user = new User([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
                'role' => User::ROLE_ADMIN,
                'is_active' => true,
            ]);
            $user->tenant_id = $tenant->id;
            $user->save();

            return [$tenant, $user];
        });

        $token = $user->createToken('web')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'tenant' => [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'plan' => $tenant->plan,
                    'status' => $tenant->status,
                    'trial_ends_at' => $tenant->trial_ends_at?->toDateString(),
                    'max_users' => $tenant->effectiveMaxUsers(),
                ],
            ],
        ], 201);
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'org';
        $slug = $base;
        $i = 1;

        while (Tenant::where('slug', $slug)->exists()) {
            $slug = $base . '-' . (++$i);
        }

        return $slug;
    }
}
