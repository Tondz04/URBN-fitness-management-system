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
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->string('rfid_tag')->unique()->nullable(); // RFID tag for access control
            $table->enum('status', ['active', 'inactive', 'expired'])->default('active');
            $table->date('membership_start_date')->nullable();
            $table->date('membership_end_date')->nullable();
            $table->enum('membership_type', ['student', 'regular', 'regular_with_coach'])->nullable();
            $table->decimal('membership_fee', 8, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
