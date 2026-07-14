<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Document extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'documentable_type',
        'documentable_id',
        'requirement_id',
        'issue_date',
        'expiry_date',
        'observation',
        'original_filename',
        'stored_path',
        'storage_driver',
        'sharepoint_drive_id',
        'sharepoint_item_id',
        'sharepoint_web_url',
        'mime_type',
        'size_bytes',
        'uploaded_by',
    ];

    protected $casts = [
        'issue_date' => 'date',
        'expiry_date' => 'date',
        'size_bytes' => 'integer',
    ];

    protected $appends = [
        'url',
        'status',
    ];

    public function documentable(): MorphTo
    {
        return $this->morphTo();
    }

    public function requirement(): BelongsTo
    {
        return $this->belongsTo(Requirement::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function getUrlAttribute(): ?string
    {
        if ($this->storage_driver === 'sharepoint') {
            return $this->sharepoint_web_url ?: null;
        }

        if (!$this->stored_path) {
            return null;
        }

        $baseUrl = rtrim((string) config('app.url'), '/');
        $relative = ltrim((string) $this->stored_path, '/');

        return $baseUrl . '/storage/' . $relative;
    }

    public function getStatusAttribute(): string
    {
        if (!$this->expiry_date) {
            return 'SIN_VIGENCIA';
        }

        $days = now()->diffInDays($this->expiry_date, false);
        if ($days < 0) {
            return 'VENCIDO';
        }

        if ($days <= 30) {
            return 'POR_VENCER';
        }

        return 'VIGENTE';
    }
}
