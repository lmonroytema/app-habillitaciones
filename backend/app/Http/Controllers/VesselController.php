<?php

namespace App\Http\Controllers;

use App\Models\Vessel;
use Illuminate\Http\Request;

class VesselController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $query = Vessel::query()->with(['project', 'company'])->withCount('documents');

        foreach (['project_id', 'company_id'] as $key) {
            if (request($key)) {
                $query->where($key, request($key));
            }
        }

        if (request('is_active') !== null) {
            $query->where('is_active', filter_var(request('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        if (request('search')) {
            $search = trim((string) request('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('registration', 'like', "%{$search}%");
            });
        }

        return $query->orderBy('name')->paginate((int) request('per_page', 25));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_id' => ['nullable', 'integer', $this->tenantExists('projects')],
            'company_id' => ['nullable', 'integer', $this->tenantExists('companies')],
            'name' => ['required', 'string', 'max:255'],
            'registration' => ['nullable', 'string', 'max:255', $this->tenantUnique('vessels', 'registration')],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $vessel = Vessel::create($validated);
        return response()->json($vessel->load(['project', 'company']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Vessel $vessel)
    {
        return $vessel->load(['project', 'company', 'documents']);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Vessel $vessel)
    {
        $validated = $request->validate([
            'project_id' => ['nullable', 'integer', $this->tenantExists('projects')],
            'company_id' => ['nullable', 'integer', $this->tenantExists('companies')],
            'name' => ['required', 'string', 'max:255'],
            'registration' => ['nullable', 'string', 'max:255', $this->tenantUnique('vessels', 'registration', $vessel->id)],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $vessel->update($validated);
        return $vessel->load(['project', 'company']);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Vessel $vessel)
    {
        $vessel->delete();
        return response()->json(['message' => 'OK']);
    }
}
