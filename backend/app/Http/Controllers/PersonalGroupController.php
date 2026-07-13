<?php

namespace App\Http\Controllers;

use App\Models\PersonalGroup;
use Illuminate\Http\Request;

class PersonalGroupController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $query = PersonalGroup::query();

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
            'name' => ['required', 'string', 'max:255', 'unique:personal_groups,name'],
        ]);

        $group = PersonalGroup::create($validated);
        return response()->json($group, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(PersonalGroup $personalGroup)
    {
        return $personalGroup;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, PersonalGroup $personalGroup)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:personal_groups,name,' . $personalGroup->id],
        ]);

        $personalGroup->update($validated);
        return $personalGroup;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(PersonalGroup $personalGroup)
    {
        $personalGroup->delete();
        return response()->json(['message' => 'OK']);
    }
}
