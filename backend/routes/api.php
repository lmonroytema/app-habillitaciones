<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\PersonalGroupController;
use App\Http\Controllers\PersonController;
use App\Http\Controllers\PositionController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\RequirementController;
use App\Http\Controllers\VehicleController;
use App\Http\Controllers\VesselController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('documents/{document}/file', [DocumentController::class, 'file']);
    Route::apiResource('companies', CompanyController::class);
    Route::apiResource('projects', ProjectController::class);
    Route::apiResource('positions', PositionController::class);
    Route::apiResource('personal-groups', PersonalGroupController::class);
    Route::apiResource('people', PersonController::class);
    Route::apiResource('vehicles', VehicleController::class);
    Route::apiResource('vessels', VesselController::class);
    Route::apiResource('requirements', RequirementController::class);
    Route::apiResource('documents', DocumentController::class);
});
