<?php

namespace App\Http\Controllers;

use App\Models\Vehicle;
use Illuminate\Http\Request;

class VehicleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $query = Vehicle::query()->with(['project', 'company', 'position'])->withCount('documents');

        foreach (['project_id', 'company_id', 'position_id'] as $key) {
            if (request($key)) {
                $query->where($key, request($key));
            }
        }

        if (request('vehicle_type')) {
            $query->where('vehicle_type', request('vehicle_type'));
        }

        if (request('is_active') !== null) {
            $query->where('is_active', filter_var(request('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        if (request('search')) {
            $search = trim((string) request('search'));
            $query->where(function ($q) use ($search) {
                $q->where('plate', 'like', "%{$search}%")
                    ->orWhere('brand', 'like', "%{$search}%")
                    ->orWhere('model', 'like', "%{$search}%");
            });
        }

        return $query->orderBy('plate')->paginate((int) request('per_page', 25));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_id' => ['nullable', 'integer', $this->tenantExists('projects')],
            'company_id' => ['nullable', 'integer', $this->tenantExists('companies')],
            'position_id' => ['nullable', 'integer', $this->tenantExists('positions')],
            'plate' => ['required', 'string', 'max:255', $this->tenantUnique('vehicles', 'plate')],
            'vehicle_type' => ['nullable', 'string', 'max:255'],
            'brand' => ['nullable', 'string', 'max:255'],
            'model' => ['nullable', 'string', 'max:255'],
            'year' => ['nullable', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $vehicle = Vehicle::create($validated);
        return response()->json($vehicle->load(['project', 'company', 'position']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Vehicle $vehicle)
    {
        return $vehicle->load(['project', 'company', 'position', 'documents']);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Vehicle $vehicle)
    {
        $validated = $request->validate([
            'project_id' => ['nullable', 'integer', $this->tenantExists('projects')],
            'company_id' => ['nullable', 'integer', $this->tenantExists('companies')],
            'position_id' => ['nullable', 'integer', $this->tenantExists('positions')],
            'plate' => ['required', 'string', 'max:255', $this->tenantUnique('vehicles', 'plate', $vehicle->id)],
            'vehicle_type' => ['nullable', 'string', 'max:255'],
            'brand' => ['nullable', 'string', 'max:255'],
            'model' => ['nullable', 'string', 'max:255'],
            'year' => ['nullable', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $vehicle->update($validated);
        return $vehicle->load(['project', 'company', 'position']);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Vehicle $vehicle)
    {
        $vehicle->delete();
        return response()->json(['message' => 'OK']);
    }
}
