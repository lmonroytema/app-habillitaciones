<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Person;
use App\Models\Vehicle;
use App\Models\Vessel;
use App\Services\SharePointClient;
use App\Support\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $query = Document::query()->with(['requirement', 'uploadedBy']);

        if (request('documentable_type') && request('documentable_id')) {
            $documentableType = $this->resolveDocumentableType((string) request('documentable_type'));
            $query->where('documentable_type', $documentableType)
                ->where('documentable_id', (int) request('documentable_id'));
        }

        return $query->latest()->paginate((int) request('per_page', 25));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'documentable_type' => ['required', 'string'],
            'documentable_id' => ['required', 'integer'],
            'requirement_id' => ['nullable', 'integer', $this->tenantExists('requirements')],
            'issue_date' => ['nullable', 'date'],
            'expiry_date' => ['nullable', 'date'],
            'observation' => ['nullable', 'string', 'max:255'],
            'file' => ['required', 'file', 'max:20480'],
        ]);

        $documentableType = $this->resolveDocumentableType($validated['documentable_type']);
        $documentableModel = $documentableType::query()->findOrFail($validated['documentable_id']);

        $file = $request->file('file');
        $client = app(SharePointClient::class);
        // Carpeta separada por tenant para aislar los archivos de cada organización.
        $baseFolder = 'tenants/' . (TenantContext::id() ?? 0) . '/documents/' . now()->format('Y/m');
        $relativePath = $baseFolder . '/' . $file->getClientOriginalName();

        $storageDriver = 'local';
        $storedPath = $file->storePublicly($baseFolder, 'public');
        $sharepointDriveId = null;
        $sharepointItemId = null;
        $sharepointWebUrl = null;

        if ($client->isEnabled()) {
            $upload = $client->upload(
                $relativePath,
                $file->getClientOriginalName(),
                (string) ($file->getClientMimeType() ?? 'application/octet-stream'),
                $file->getRealPath(),
                (int) ($file->getSize() ?? 0),
            );

            $storageDriver = 'sharepoint';
            $storedPath = (string) ($upload['path'] ?? $relativePath);
            $sharepointDriveId = (string) ($upload['drive_id'] ?? '');
            $sharepointItemId = (string) ($upload['item_id'] ?? '');
            $sharepointWebUrl = (string) ($upload['web_url'] ?? '');
        }

        $document = Document::create([
            'documentable_type' => $documentableType,
            'documentable_id' => $documentableModel->getKey(),
            'requirement_id' => $validated['requirement_id'] ?? null,
            'issue_date' => $validated['issue_date'] ?? null,
            'expiry_date' => $validated['expiry_date'] ?? null,
            'observation' => $validated['observation'] ?? null,
            'original_filename' => $file->getClientOriginalName(),
            'stored_path' => $storedPath,
            'storage_driver' => $storageDriver,
            'sharepoint_drive_id' => $sharepointDriveId ?: null,
            'sharepoint_item_id' => $sharepointItemId ?: null,
            'sharepoint_web_url' => $sharepointWebUrl ?: null,
            'mime_type' => $file->getClientMimeType(),
            'size_bytes' => $file->getSize(),
            'uploaded_by' => $request->user()?->id,
        ]);

        return response()->json($document->load(['requirement', 'uploadedBy']), 201);
    }

    public function file(Document $document)
    {
        if ($document->storage_driver === 'sharepoint') {
            if (!$document->sharepoint_drive_id || !$document->sharepoint_item_id) {
                abort(404, 'Documento sin referencia SharePoint.');
            }

            $tmpPath = app(SharePointClient::class)->downloadToTempFile(
                $document->sharepoint_drive_id,
                $document->sharepoint_item_id,
                $document->original_filename ?: 'archivo',
            );

            return response()
                ->file($tmpPath, [
                    'Content-Type' => $document->mime_type ?: 'application/octet-stream',
                    'Content-Disposition' => 'inline; filename="' . addslashes((string) ($document->original_filename ?: 'archivo')) . '"',
                ])
                ->deleteFileAfterSend(true);
        }

        if (!$document->stored_path) {
            abort(404);
        }

        $path = Storage::disk('public')->path($document->stored_path);
        if (!is_file($path)) {
            abort(404);
        }

        return response()->file($path, [
            'Content-Type' => $document->mime_type ?: 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="' . addslashes((string) ($document->original_filename ?: 'archivo')) . '"',
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(Document $document)
    {
        return $document->load(['requirement', 'uploadedBy']);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Document $document)
    {
        $validated = $request->validate([
            'requirement_id' => ['nullable', 'integer', $this->tenantExists('requirements')],
            'issue_date' => ['nullable', 'date'],
            'expiry_date' => ['nullable', 'date'],
            'observation' => ['nullable', 'string', 'max:255'],
        ]);

        $document->update($validated);
        return $document->load(['requirement', 'uploadedBy']);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Document $document)
    {
        if ($document->storage_driver === 'sharepoint') {
            if ($document->sharepoint_drive_id && $document->sharepoint_item_id) {
                try {
                    app(SharePointClient::class)->deleteItem($document->sharepoint_drive_id, $document->sharepoint_item_id);
                } catch (\Throwable) {
                }
            }
        } else {
            if ($document->stored_path) {
                Storage::disk('public')->delete($document->stored_path);
            }
        }

        $document->delete();
        return response()->json(['message' => 'OK']);
    }

    private function resolveDocumentableType(string $type): string
    {
        $type = strtolower(trim($type));

        return match ($type) {
            'person', 'people', Person::class => Person::class,
            'vehicle', Vehicle::class => Vehicle::class,
            'vessel', 'embarcacion', Vessel::class => Vessel::class,
            default => abort(422, 'documentable_type inválido.'),
        };
    }
}
