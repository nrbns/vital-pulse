const fs = require('fs');
const path = require('path');
const { query, connectDatabase } = require('./connection');

async function runMigrations() {
  try {
    console.log('🔄 Starting database migrations...');
    
    await connectDatabase();
    
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    await query(schema);
    
    console.log('✅ Database schema created');
    
    // Read and execute triggers
    const triggersPath = path.join(__dirname, 'triggers.sql');
    if (fs.existsSync(triggersPath)) {
      const triggers = fs.readFileSync(triggersPath, 'utf8');
      await query(triggers);
      console.log('✅ Database triggers created');
    }
    
    console.log('✅ Database migrations completed successfully');
    
    // Insert default countries from regions
    await seedCountries();
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function seedCountries() {
  try {
    const regionsPath = path.join(__dirname, '../../../regions');
    const regionDirs = fs.readdirSync(regionsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && dirent.name !== '_template')
      .map(dirent => dirent.name);

    for (const countryCode of regionDirs) {
      const configPath = path.join(regionsPath, countryCode, 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const rulesPath = path.join(regionsPath, countryCode, 'blood-donation-rules.json');
        const rules = fs.existsSync(rulesPath) 
          ? JSON.parse(fs.readFileSync(rulesPath, 'utf8'))
          : {};

        await query(
          `INSERT INTO countries (code, name, donation_interval_days, min_donor_age, max_donor_age, active)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (code) DO UPDATE SET
             name = EXCLUDED.name,
             donation_interval_days = EXCLUDED.donation_interval_days,
             min_donor_age = EXCLUDED.min_donor_age,
             max_donor_age = EXCLUDED.max_donor_age,
             active = EXCLUDED.active,
             updated_at = CURRENT_TIMESTAMP`,
          [
            countryCode,
            config.countryName,
            rules.donationIntervalDays || 56,
            rules.minDonorAge || 18,
            rules.maxDonorAge || 65,
            config.active !== false
          ]
        );
        console.log(`  ✅ Seeded country: ${config.countryName} (${countryCode})`);
      }
    }
  } catch (error) {
    console.error('Error seeding countries:', error);
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations, seedCountries };

