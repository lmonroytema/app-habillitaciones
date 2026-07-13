<?php

namespace App\Http\Controllers;

use App\Models\Position;
use Illuminate\Http\Request;

class PositionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $query = Position::query();

        if (request('search')) {
            $search = trim((string) request('search'));
            $query->where('name', 'like', "%{$search}%");
        }

        if (request('category')) {
            $query->where('category', request('category'));
        }

        return $query->orderBy('name')->paginate((int) request('per_page', 25));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:positions,name'],
            'category' => ['nullable', 'string', 'max:255'],
        ]);

        $position = Position::create($validated);
        return response()->json($position, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Position $position)
    {
        return $position;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Position $position)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:positions,name,' . $position->id],
            'category' => ['nullable', 'string', 'max:255'],
        ]);

        $position->update($validated);
        return $position;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Position $position)
    {
        $position->delete();
        return response()->json(['message' => 'OK']);
    }
}
