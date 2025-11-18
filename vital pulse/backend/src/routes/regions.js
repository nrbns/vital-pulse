const express = require('express');
const router = express.Router();
const { getRegionConfig, getDonationRules, getEmergencyNumbers, getActiveCountries } = require('../utils/regionLoader');

/**
 * Get region configuration
 * GET /api/v1/regions/:countryCode/config
 */
router.get('/:countryCode/config', (req, res) => {
  try {
    const { countryCode } = req.params;
    const region = getRegionConfig(countryCode);

    if (!region) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Configuration not found for country: ${countryCode}`
        }
      });
    }

    const rules = getDonationRules(countryCode);
    const emergency = getEmergencyNumbers(countryCode);

    res.json({
      success: true,
      countryCode: countryCode.toUpperCase(),
      countryName: region.config.countryName,
      defaultLanguage: region.config.defaultLanguage,
      supportedLanguages: Object.keys(region.languages || {}),
      donationIntervalDays: rules?.donationIntervalDays || 56,
      minDonorAge: rules?.minDonorAge || 18,
      maxDonorAge: rules?.maxDonorAge || 65,
      emergencyNumbers: emergency || {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * Get active countries
 * GET /api/v1/regions
 */
router.get('/', (req, res) => {
  try {
    const countries = getActiveCountries();
    res.json({
      success: true,
      countries: countries.map(code => {
        const region = getRegionConfig(code);
        return {
          code,
          name: region?.config?.countryName || code
        };
      })
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

module.exports = router;

