<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    public const PLAN_TRIAL = 'trial';
    public const PLAN_BASIC = 'basic';
    public const PLAN_PRO = 'pro';
    public const PLAN_ENTERPRISE = 'enterprise';

    public const STATUS_ACTIVE = 'active';
    public const STATUS_SUSPENDED = 'suspended';

    /**
     * Límite de usuarios por plan (null = ilimitado).
     * Se usa como valor por defecto; max_users en la fila permite
     * negociar límites distintos por cliente.
     */
    public const PLAN_MAX_USERS = [
        self::PLAN_TRIAL => 3,
        self::PLAN_BASIC => 10,
        self::PLAN_PRO => 25,
        self::PLAN_ENTERPRISE => null,
    ];

    public const TRIAL_DAYS = 30;

    protected $fillable = [
        'name',
        'slug',
        'ruc',
        'contact_email',
        'contact_phone',
        'plan',
        'status',
        'trial_ends_at',
        'max_users',
        'settings',
    ];

    protected $casts = [
        'trial_ends_at' => 'date:Y-m-d',
        'settings' => 'array',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public static function plans(): array
    {
        return [self::PLAN_TRIAL, self::PLAN_BASIC, self::PLAN_PRO, self::PLAN_ENTERPRISE];
    }

    public function isSuspended(): bool
    {
        return $this->status === self::STATUS_SUSPENDED;
    }

    public function isTrialExpired(): bool
    {
        return $this->plan === self::PLAN_TRIAL
            && $this->trial_ends_at !== null
            && $this->trial_ends_at->isPast();
    }

    public function effectiveMaxUsers(): ?int
    {
        if ($this->max_users !== null) {
            return (int) $this->max_users;
        }

        return self::PLAN_MAX_USERS[$this->plan] ?? null;
    }
}
