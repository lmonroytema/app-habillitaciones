<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Position extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'name',
        'category',
    ];

    public function people(): HasMany
    {
        return $this->hasMany(Person::class);
    }

    public function vehicles(): HasMany
    {
        return $this->hasMany(Vehicle::class);
    }

    public function requirements(): HasMany
    {
        return $this->hasMany(Requirement::class);
    }
}
