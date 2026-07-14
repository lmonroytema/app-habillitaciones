<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tablas de dominio que pasan a estar aisladas por tenant.
     *
     * @var list<string>
     */
    private array $tenantTables = [
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

    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('tenant_id')->nullable()->after('id')->constrained('tenants')->cascadeOnDelete();
            $table->string('role', 30)->default('operator')->after('password');
            $table->boolean('is_active')->default(true)->after('role');
        });

        foreach ($this->tenantTables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreignId('tenant_id')->nullable()->after('id')->constrained('tenants')->cascadeOnDelete();
                $table->index('tenant_id');
            });
        }

        // El RUC de empresas deja de ser único global: ahora es único por tenant.
        Schema::table('companies', function (Blueprint $table) {
            $table->dropUnique(['ruc']);
            $table->unique(['tenant_id', 'ruc']);
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'ruc']);
            $table->unique(['ruc']);
        });

        foreach ($this->tenantTables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropConstrainedForeignId('tenant_id');
            });
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('tenant_id');
            $table->dropColumn(['role', 'is_active']);
        });
    }
};
