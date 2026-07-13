<?php

namespace App\Http\Controllers;

use App\Models\Requirement;
use Illuminate\Http\Request;

class RequirementController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $query = Requirement::query()->with(['project', 'position']);

        if (request('scope')) {
            $query->where('scope', request('scope'));
        }
        if (request('project_id')) {
            $query->where('project_id', request('project_id'));
        }
        if (request('position_id')) {
            $query->where('position_id', request('position_id'));
        }
        if (request('vehicle_type')) {
            $query->where('vehicle_type', request('vehicle_type'));
        }
        if (request('search')) {
            $search = trim((string) request('search'));
            $query->where('name', 'like', "%{$search}%");
        }

        return $query->orderBy('name')->paginate((int) request('per_page', 25));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'scope' => ['required', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'abbreviation' => ['nullable', 'string', 'max:255'],
            'is_required' => ['nullable', 'boolean'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'position_id' => ['nullable', 'integer', 'exists:positions,id'],
            'vehicle_type' => ['nullable', 'string', 'max:255'],
        ]);

        $requirement = Requirement::create($validated);
        return response()->json($requirement->load(['project', 'position']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Requirement $requirement)
    {
        return $requirement->load(['project', 'position']);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Requirement $requirement)
    {
        $validated = $request->validate([
            'scope' => ['required', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'abbreviation' => ['nullable', 'string', 'max:255'],
            'is_required' => ['nullable', 'boolean'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'position_id' => ['nullable', 'integer', 'exists:positions,id'],
            'vehicle_type' => ['nullable', 'string', 'max:255'],
        ]);

        $requirement->update($validated);
        return $requirement->load(['project', 'position']);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Requirement $requirement)
    {
        $requirement->delete();
        return response()->json(['message' => 'OK']);
    }
}
