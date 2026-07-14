<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Company extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'name',
        'ruc',
        'email',
        'phone',
        'address',
    ];

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    public function people(): HasMany
    {
        return $this->hasMany(Person::class);
    }

    public function vehicles(): HasMany
    {
        return $this->hasMany(Vehicle::class);
    }

    public function vessels(): HasMany
    {
        return $this->hasMany(Vessel::class);
    }
}
