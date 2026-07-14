<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PersonalGroup extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'name',
    ];

    public function people(): HasMany
    {
        return $this->hasMany(Person::class);
    }
}
