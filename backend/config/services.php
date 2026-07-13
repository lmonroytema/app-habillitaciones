<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'sharepoint' => [
        'driver' => env('DOCUMENT_STORAGE_DRIVER', 'local'),
        'tenant_id' => env('SHAREPOINT_TENANT_ID'),
        'client_id' => env('SHAREPOINT_CLIENT_ID'),
        'client_secret' => env('SHAREPOINT_CLIENT_SECRET'),
        'site_id' => env('SHAREPOINT_SITE_ID'),
        'drive_id' => env('SHAREPOINT_DRIVE_ID'),
        'base_folder' => env('SHAREPOINT_BASE_FOLDER', 'habilitaciones/documents'),
        'simple_upload_max_mb' => (int) env('SHAREPOINT_SIMPLE_UPLOAD_MAX_MB', 4),
    ],

];
