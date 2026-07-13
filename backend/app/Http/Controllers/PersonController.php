<?php

namespace App\Http\Controllers;

use App\Models\Person;
use Illuminate\Http\Request;

class PersonController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $query = Person::query()->with(['project', 'company', 'position', 'personalGroup'])->withCount('documents');

        foreach (['project_id', 'company_id', 'position_id', 'personal_group_id'] as $key) {
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
                $q->where('full_name', 'like', "%{$search}%")
                    ->orWhere('document_id', 'like', "%{$search}%");
            });
        }

        return $query->orderBy('full_name')->paginate((int) request('per_page', 25));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'company_id' => ['nullable', 'integer', 'exists:companies,id'],
            'position_id' => ['nullable', 'integer', 'exists:positions,id'],
            'personal_group_id' => ['nullable', 'integer', 'exists:personal_groups,id'],
            'document_id' => ['nullable', 'string', 'max:255'],
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $person = Person::create($validated);
        return response()->json($person->load(['project', 'company', 'position', 'personalGroup']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Person $person)
    {
        return $person->load(['project', 'company', 'position', 'personalGroup', 'documents']);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Person $person)
    {
        $validated = $request->validate([
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'company_id' => ['nullable', 'integer', 'exists:companies,id'],
            'position_id' => ['nullable', 'integer', 'exists:positions,id'],
            'personal_group_id' => ['nullable', 'integer', 'exists:personal_groups,id'],
            'document_id' => ['nullable', 'string', 'max:255'],
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $person->update($validated);
        return $person->load(['project', 'company', 'position', 'personalGroup']);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Person $person)
    {
        $person->delete();
        return response()->json(['message' => 'OK']);
    }
}
