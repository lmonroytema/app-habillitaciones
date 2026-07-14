<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $query = Project::query()->with('company');

        if (request('company_id')) {
            $query->where('company_id', request('company_id'));
        }

        if (request('is_active') !== null) {
            $query->where('is_active', filter_var(request('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        if (request('search')) {
            $search = trim((string) request('search'));
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            });
        }

        return $query->orderBy('code')->paginate((int) request('per_page', 25));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:255', $this->tenantUnique('projects', 'code')],
            'name' => ['required', 'string', 'max:255'],
            'company_id' => ['nullable', 'integer', $this->tenantExists('companies')],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $project = Project::create($validated);
        return response()->json($project->load('company'), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Project $project)
    {
        return $project->load('company');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Project $project)
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:255', $this->tenantUnique('projects', 'code', $project->id)],
            'name' => ['required', 'string', 'max:255'],
            'company_id' => ['nullable', 'integer', $this->tenantExists('companies')],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $project->update($validated);
        return $project->load('company');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Project $project)
    {
        $project->delete();
        return response()->json(['message' => 'OK']);
    }
}
