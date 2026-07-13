<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->string('storage_driver')->default('local')->after('stored_path');
            $table->string('sharepoint_drive_id')->nullable()->after('storage_driver');
            $table->string('sharepoint_item_id')->nullable()->after('sharepoint_drive_id');
            $table->text('sharepoint_web_url')->nullable()->after('sharepoint_item_id');

            $table->index(['storage_driver']);
            $table->index(['sharepoint_drive_id', 'sharepoint_item_id']);
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropIndex(['storage_driver']);
            $table->dropIndex(['sharepoint_drive_id', 'sharepoint_item_id']);
            $table->dropColumn(['storage_driver', 'sharepoint_drive_id', 'sharepoint_item_id', 'sharepoint_web_url']);
        });
    }
};

