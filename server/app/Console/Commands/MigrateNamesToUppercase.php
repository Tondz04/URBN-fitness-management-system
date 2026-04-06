<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;

class MigrateNamesToUppercase extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'migrate:names-uppercase';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate all existing user names to uppercase';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting name migration to uppercase...');

        $users = User::all();
        $updated = 0;

        foreach ($users as $user) {
            $originalName = $user->name;
            $uppercaseName = strtoupper($originalName);

            if ($originalName !== $uppercaseName) {
                $user->name = $uppercaseName;
                $user->save();
                $updated++;
                $this->line("Updated: {$originalName} → {$uppercaseName}");
            }
        }

        $this->info("Migration complete! Updated {$updated} user(s).");
        return 0;
    }
}
