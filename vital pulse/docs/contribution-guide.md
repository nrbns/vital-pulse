# Contribution Guide: Adding a New Country/Region

This guide will help you add support for a new country or region to Pulse in less than 5 minutes.

## Quick Start

1. **Fork and clone** the repository
2. **Copy the template** from `regions/_template/`
3. **Fill in your country's data**
4. **Test the configuration**
5. **Submit a Pull Request**

## Step-by-Step Instructions

### Step 1: Find Your Country Code

Use ISO 3166-1 alpha-2 country codes (2 letters):
- India: `IN`
- Nigeria: `NG`
- Indonesia: `ID`
- United States: `US`
- etc.

You can find codes at: https://www.iso.org/obp/ui/#search

### Step 2: Create Region Directory

```bash
mkdir -p regions/XX
cd regions/XX
```

Replace `XX` with your country code.

### Step 3: Copy Template Files

Copy all files from `regions/_template/` to your new directory:

```bash
cp ../_template/*.json .
```

You should have:
- `config.json`
- `languages.json`
- `blood-donation-rules.json`
- `sms-gateway.json`
- `emergency-numbers.json`

### Step 4: Edit config.json

This is the main configuration file. Update these fields:

```json
{
  "countryCode": "XX",           // Your ISO country code
  "countryName": "Country Name", // Full country name
  "defaultLanguage": "en",       // Default language code (ISO 639-1)
  "supportedLanguages": ["en"],  // Array of supported languages
  "currency": "USD",             // Currency code (ISO 4217)
  "timezone": "UTC",             // Timezone (IANA format)
  "phoneNumberFormat": {
    "countryCode": "XX",         // Country calling code
    "format": "+XX XXXXXXXXXX",  // Phone number format
    "minLength": 10,             // Minimum phone length
    "maxLength": 15              // Maximum phone length
  },
  "emergencyServices": {
    "ambulance": "112",          // Ambulance number
    "police": "110",             // Police number
    "fire": "113",               // Fire department
    "medicalEmergency": "112"    // Medical emergency
  }
}
```

**Examples**:

India (`IN`):
```json
{
  "countryCode": "IN",
  "countryName": "India",
  "phoneNumberFormat": {
    "countryCode": "91",
    "format": "+91 XXXXXXXXXX",
    "minLength": 10,
    "maxLength": 10
  },
  "emergencyServices": {
    "ambulance": "108",
    "police": "100",
    "fire": "101",
    "medicalEmergency": "108"
  }
}
```

Nigeria (`NG`):
```json
{
  "countryCode": "NG",
  "countryName": "Nigeria",
  "phoneNumberFormat": {
    "countryCode": "234",
    "format": "+234 XXXXXXXXXX",
    "minLength": 10,
    "maxLength": 11
  },
  "emergencyServices": {
    "ambulance": "112",
    "police": "112",
    "fire": "112",
    "medicalEmergency": "112"
  }
}
```

### Step 5: Edit blood-donation-rules.json

This file contains blood donation regulations specific to your country.

**Key Fields**:

```json
{
  "donationIntervalDays": 56,  // Days between donations (typically 56 or 90)
  "minDonorAge": 18,           // Minimum age to donate
  "maxDonorAge": 65,           // Maximum age to donate
  "weightMinimumKg": 50,       // Minimum weight in kg
  "hemoglobinMinimum": {
    "male": 13.0,              // Minimum hemoglobin for males (g/dL)
    "female": 12.5             // Minimum hemoglobin for females (g/dL)
  },
  "bloodGroups": {
    "O+": { "prevalence": 0.38 },
    "O-": { "prevalence": 0.07 },
    "A+": { "prevalence": 0.34 },
    // ... other blood groups
  },
  "rareGroups": ["AB-", "B-", "O-"]  // Rare blood groups in your country
}
```

**Common Donation Intervals**:
- **56 days**: Most of the world (USA, Europe, many countries)
- **90 days**: India, some other countries

**Finding Blood Group Prevalence**:
- Search for "blood group distribution [your country]"
- Use statistics from national blood banks or health departments
- If unavailable, use global averages

### Step 6: Edit emergency-numbers.json

List emergency contact numbers for your country:

```json
{
  "ambulance": "112",
  "police": "110",
  "fire": "113",
  "medicalEmergency": "112",
  "poisonControl": "",
  "suicidePrevention": "",
  "domesticViolence": "",
  "custom": [
    {
      "name": "Custom Service",
      "number": "123"
    }
  ]
}
```

**Verification Tips**:
- Verify numbers from official government sources
- Some countries use a single emergency number (e.g., 112)
- Include specialized helplines if available

### Step 7: Edit languages.json

Add supported languages for your country:

```json
{
  "en": {
    "name": "English",
    "nativeName": "English",
    "supported": true
  },
  "xx": {
    "name": "Your Language",
    "nativeName": "Native Name",
    "supported": true
  }
}
```

Use ISO 639-1 language codes: https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes

### Step 8: Edit sms-gateway.json

Configure SMS provider for your country (if available):

```json
{
  "enabled": true,
  "provider": "twilio",  // or "msg91", "nexmo", etc.
  "config": {
    "accountSid": "",
    "authToken": "",
    "fromNumber": ""
  }
}
```

**Common Providers**:
- **Twilio**: Global (default)
- **MSG91**: India
- **Nexmo/Vonage**: Multiple countries
- Leave as-is if unsure (will use Twilio default)

### Step 9: Test Your Configuration

Test that your JSON files are valid:

```bash
# Install jq (JSON processor)
# macOS: brew install jq
# Linux: apt-get install jq

# Validate JSON syntax
cat regions/XX/config.json | jq .
cat regions/XX/blood-donation-rules.json | jq .
cat regions/XX/emergency-numbers.json | jq .
cat regions/XX/languages.json | jq .
cat regions/XX/sms-gateway.json | jq .
```

All files should parse without errors.

### Step 10: Update README

Add your country to the "Current Regions" table in `README.md`:

```markdown
| Your Country | ✅ | Full config |
```

### Step 11: Submit Pull Request

1. **Commit your changes**:
   ```bash
   git add regions/XX/
   git commit -m "feat: add country XX support"
   ```

2. **Push to your fork**:
   ```bash
   git push origin feature/add-XX-country
   ```

3. **Open a Pull Request** on GitHub with:
   - Title: `Add support for [Country Name] (XX)`
   - Description:
     - Brief overview of your country
     - Any special considerations (unique rules, etc.)
     - Verification of emergency numbers
     - Sources for blood donation rules (if applicable)

## Checklist

Before submitting, ensure:

- [ ] All JSON files are valid (no syntax errors)
- [ ] Country code is correct (ISO 3166-1 alpha-2)
- [ ] Emergency numbers are verified
- [ ] Donation rules match your country's regulations
- [ ] Phone number format is correct
- [ ] Languages are properly listed
- [ ] README is updated with your country

## Example: Adding Brazil

```bash
# 1. Create directory
mkdir regions/BR

# 2. Copy template
cp regions/_template/*.json regions/BR/

# 3. Edit config.json
# - countryCode: "BR"
# - countryName: "Brazil"
# - phoneNumberFormat: "+55 XXXXXXXXXXX"
# - emergencyServices: ambulance "192", police "190", fire "193"

# 4. Edit blood-donation-rules.json
# - donationIntervalDays: 90 (Brazil uses 90 days)
# - Update blood group prevalence for Brazil

# 5. Edit languages.json
# - Add "pt" (Portuguese)

# 6. Test and submit PR
```

## Getting Help

- **GitHub Discussions**: Ask questions about adding countries
- **GitHub Issues**: Report issues with existing configs
- **Discord/Slack**: Join our community (link in README)

## Verification Sources

When adding a country, please verify from:

1. **Emergency Numbers**:
   - Government websites
   - National health departments
   - Official emergency service websites

2. **Blood Donation Rules**:
   - National blood bank organizations
   - Health ministry guidelines
   - Red Cross/Crescent societies

3. **Blood Group Distribution**:
   - National statistics
   - Blood bank reports
   - Medical research papers

## Thank You! 🙏

Every country you add makes Pulse accessible to millions more people who need emergency health services. Your contribution saves lives!

