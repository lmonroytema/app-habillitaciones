<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Requirement extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'scope',
        'name',
        'abbreviation',
        'is_required',
        'project_id',
        'position_id',
        'vehicle_type',
    ];

    protected $casts = [
        'is_required' => 'boolean',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }
}
