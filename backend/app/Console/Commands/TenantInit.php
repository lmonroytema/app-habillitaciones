<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Migración one-shot al modelo SaaS: crea el tenant inicial y le asigna
 * todos los datos y usuarios existentes que aún no pertenecen a ninguno.
 *
 *   php artisan tenant:init "TEMA" --super=admin@tema.com.pe
 */
class TenantInit extends Command
{
    protected $signature = 'tenant:init
        {name : Nombre de la organización inicial (p. ej. "TEMA")}
        {--plan=enterprise : Plan del tenant inicial}
        {--super= : Email de un usuario existente que pasa a super_admin de la plataforma}';

    protected $description = 'Crea el tenant inicial y adopta todos los datos existentes sin tenant.';

    private const TENANT_TABLES = [
        'companies',
        'projects',
        'positions',
        'personal_groups',
        'people',
        'vehicles',
        'vessels',
        'requirements',
        'documents',
    ];

    public function handle(): int
    {
        $name = (string) $this->argument('name');
        $plan = (string) $this->option('plan');

        if (!in_array($plan, Tenant::plans(), true)) {
            $this->error("Plan inválido: {$plan}. Use: " . implode(', ', Tenant::plans()));
            return self::FAILURE;
        }

        $tenant = DB::transaction(function () use ($name, $plan) {
            $tenant = Tenant::firstOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name, 'plan' => $plan, 'status' => Tenant::STATUS_ACTIVE],
            );

            foreach (self::TENANT_TABLES as $table) {
                $count = DB::table($table)->whereNull('tenant_id')->update(['tenant_id' => $tenant->id]);
                if ($count > 0) {
                    $this->line("  {$table}: {$count} registros asignados");
                }
            }

            $users = User::whereNull('tenant_id')
                ->where('role', '!=', User::ROLE_SUPER_ADMIN)
                ->get();

            foreach ($users as $user) {
                $user->tenant_id = $tenant->id;
                if ($user->role === User::ROLE_OPERATOR && $users->count() === 1) {
                    $user->role = User::ROLE_ADMIN;
                }
                $user->save();
            }

            if ($users->count() > 0) {
                $this->line("  users: {$users->count()} usuarios asignados");
            }

            return $tenant;
        });

        if ($superEmail = $this->option('super')) {
            $super = User::where('email', $superEmail)->first();
            if (!$super) {
                $this->warn("No existe un usuario con email {$superEmail}; super_admin no asignado.");
            } else {
                $super->role = User::ROLE_SUPER_ADMIN;
                $super->tenant_id = null;
                $super->save();
                $this->info("{$superEmail} ahora es super_admin de la plataforma.");
            }
        }

        $this->info("Tenant \"{$tenant->name}\" (id {$tenant->id}, plan {$tenant->plan}) listo.");

        return self::SUCCESS;
    }
}
