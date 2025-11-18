const fs = require('fs');
const path = require('path');

let regionsCache = {};

/**
 * Load all region configurations
 */
function loadRegions() {
  const regionsPath = path.join(__dirname, '../../../regions');
  
  if (!fs.existsSync(regionsPath)) {
    console.warn('⚠️  Regions directory not found');
    return {};
  }

  const regionDirs = fs.readdirSync(regionsPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name !== '_template')
    .map(dirent => dirent.name);

  regionsCache = {};

  for (const countryCode of regionDirs) {
    try {
      const regionConfig = loadRegionConfig(countryCode);
      if (regionConfig) {
        regionsCache[countryCode.toUpperCase()] = regionConfig;
      }
    } catch (error) {
      console.error(`Error loading region ${countryCode}:`, error.message);
    }
  }

  console.log(`✅ Loaded ${Object.keys(regionsCache).length} region configurations`);
  return regionsCache;
}

/**
 * Load configuration for a specific country
 */
function loadRegionConfig(countryCode) {
  const regionPath = path.join(__dirname, '../../../regions', countryCode.toUpperCase());
  
  if (!fs.existsSync(regionPath)) {
    return null;
  }

  const configPath = path.join(regionPath, 'config.json');
  const rulesPath = path.join(regionPath, 'blood-donation-rules.json');
  const emergencyPath = path.join(regionPath, 'emergency-numbers.json');
  const languagesPath = path.join(regionPath, 'languages.json');
  const smsPath = path.join(regionPath, 'sms-gateway.json');

  const config = fs.existsSync(configPath) 
    ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
    : {};
  
  const rules = fs.existsSync(rulesPath)
    ? JSON.parse(fs.readFileSync(rulesPath, 'utf8'))
    : {};

  const emergency = fs.existsSync(emergencyPath)
    ? JSON.parse(fs.readFileSync(emergencyPath, 'utf8'))
    : {};

  const languages = fs.existsSync(languagesPath)
    ? JSON.parse(fs.readFileSync(languagesPath, 'utf8'))
    : {};

  const sms = fs.existsSync(smsPath)
    ? JSON.parse(fs.readFileSync(smsPath, 'utf8'))
    : {};

  return {
    config,
    rules,
    emergency,
    languages,
    sms
  };
}

/**
 * Get region configuration for a country
 */
function getRegionConfig(countryCode) {
  const code = countryCode?.toUpperCase();
  if (!code) return null;
  
  // Check cache first
  if (regionsCache[code]) {
    return regionsCache[code];
  }

  // Try to load if not in cache
  const config = loadRegionConfig(code);
  if (config) {
    regionsCache[code] = config;
  }

  return config || null;
}

/**
 * Get donation rules for a country
 */
function getDonationRules(countryCode) {
  const region = getRegionConfig(countryCode);
  return region?.rules || null;
}

/**
 * Get emergency numbers for a country
 */
function getEmergencyNumbers(countryCode) {
  const region = getRegionConfig(countryCode);
  return region?.emergency || null;
}

/**
 * Get all active countries
 */
function getActiveCountries() {
  return Object.keys(regionsCache).filter(code => {
    const region = regionsCache[code];
    return region?.config?.active !== false;
  });
}

module.exports = {
  loadRegions,
  loadRegionConfig,
  getRegionConfig,
  getDonationRules,
  getEmergencyNumbers,
  getActiveCountries,
  regionsCache
};

