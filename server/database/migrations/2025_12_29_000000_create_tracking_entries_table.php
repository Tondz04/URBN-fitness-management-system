<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tracking_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('user_name')->nullable();
            $table->string('rfid_tag');
            $table->timestamp('timestamp');
            $table->enum('status', ['granted', 'denied'])->default('denied');
            $table->string('reason')->nullable();
            $table->timestamps();
            
            // Indexes for faster queries
            $table->index('rfid_tag');
            $table->index('timestamp');
            $table->index('user_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tracking_entries');
    }
};

