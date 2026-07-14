<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Administración de organizaciones cliente (solo super_admin de la plataforma).
 */
class TenantController extends Controller
{
    public function index()
    {
        $query = Tenant::query()->withCount('users')->orderBy('name');

        if (request('search')) {
            $search = trim((string) request('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('ruc', 'like', "%{$search}%")
                    ->orWhere('contact_email', 'like', "%{$search}%");
            });
        }

        if (request('status')) {
            $query->where('status', request('status'));
        }

        return $query->paginate((int) request('per_page', 25));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'ruc' => ['nullable', 'string', 'max:20'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:50'],
            'plan' => ['required', Rule::in(Tenant::plans())],
            'max_users' => ['nullable', 'integer', 'min:1'],
            'trial_ends_at' => ['nullable', 'date'],
            'admin_name' => ['required', 'string', 'max:255'],
            'admin_email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'admin_password' => ['required', 'string', 'min:8'],
        ]);

        $tenant = DB::transaction(function () use ($validated) {
            $tenant = Tenant::create([
                'name' => $validated['name'],
                'slug' => $this->uniqueSlug($validated['name']),
                'ruc' => $validated['ruc'] ?? null,
                'contact_email' => $validated['contact_email'] ?? $validated['admin_email'],
                'contact_phone' => $validated['contact_phone'] ?? null,
                'plan' => $validated['plan'],
                'status' => Tenant::STATUS_ACTIVE,
                'max_users' => $validated['max_users'] ?? null,
                'trial_ends_at' => $validated['plan'] === Tenant::PLAN_TRIAL
                    ? ($validated['trial_ends_at'] ?? now()->addDays(Tenant::TRIAL_DAYS)->toDateString())
                    : null,
            ]);

            $admin = new User([
                'name' => $validated['admin_name'],
                'email' => $validated['admin_email'],
                'password' => $validated['admin_password'],
                'role' => User::ROLE_ADMIN,
                'is_active' => true,
            ]);
            $admin->tenant_id = $tenant->id;
            $admin->save();

            return $tenant;
        });

        return response()->json($tenant->loadCount('users'), 201);
    }

    public function show(Tenant $tenant)
    {
        return $tenant->loadCount('users')->load(['users' => function ($q) {
            $q->orderBy('name');
        }]);
    }

    public function update(Request $request, Tenant $tenant)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'ruc' => ['nullable', 'string', 'max:20'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:50'],
            'plan' => ['required', Rule::in(Tenant::plans())],
            'status' => ['required', Rule::in([Tenant::STATUS_ACTIVE, Tenant::STATUS_SUSPENDED])],
            'max_users' => ['nullable', 'integer', 'min:1'],
            'trial_ends_at' => ['nullable', 'date'],
        ]);

        $tenant->update($validated);

        return $tenant->loadCount('users');
    }

    public function destroy(Tenant $tenant)
    {
        $tenant->delete();

        return response()->json(['message' => 'OK']);
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
