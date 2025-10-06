/**
 * Utility functions for mapping language codes to country codes for flag display
 * Uses ISO 639-1 language codes to ISO 3166-1 alpha-2 country codes
 */

// Mapping of language codes to appropriate country codes for flag display
const LANGUAGE_TO_COUNTRY_MAP: Record<string, string> = {
  // European Languages
  'es': 'ES', // Spanish → Spain
  'fr': 'FR', // French → France
  'de': 'DE', // German → Germany
  'it': 'IT', // Italian → Italy
  'pt': 'PT', // Portuguese → Portugal
  'nl': 'NL', // Dutch → Netherlands
  'sv': 'SE', // Swedish → Sweden
  'no': 'NO', // Norwegian → Norway
  'da': 'DK', // Danish → Denmark
  'fi': 'FI', // Finnish → Finland
  'is': 'IS', // Icelandic → Iceland
  'pl': 'PL', // Polish → Poland
  'cs': 'CZ', // Czech → Czech Republic
  'sk': 'SK', // Slovak → Slovakia
  'hu': 'HU', // Hungarian → Hungary
  'ro': 'RO', // Romanian → Romania
  'bg': 'BG', // Bulgarian → Bulgaria
  'hr': 'HR', // Croatian → Croatia
  'sr': 'RS', // Serbian → Serbia
  'sl': 'SI', // Slovenian → Slovenia
  'et': 'EE', // Estonian → Estonia
  'lv': 'LV', // Latvian → Latvia
  'lt': 'LT', // Lithuanian → Lithuania
  'mt': 'MT', // Maltese → Malta
  'el': 'GR', // Greek → Greece
  
  // Asian Languages
  'ja': 'JP', // Japanese → Japan
  'ko': 'KR', // Korean → South Korea
  'zh': 'CN', // Chinese → China
  'hi': 'IN', // Hindi → India
  'th': 'TH', // Thai → Thailand
  'vi': 'VN', // Vietnamese → Vietnam
  'id': 'ID', // Indonesian → Indonesia
  'ms': 'MY', // Malay → Malaysia
  'tl': 'PH', // Filipino → Philippines
  'my': 'MM', // Burmese → Myanmar
  'km': 'KH', // Khmer → Cambodia
  'lo': 'LA', // Lao → Laos
  'mn': 'MN', // Mongolian → Mongolia
  'ka': 'GE', // Georgian → Georgia
  'am': 'ET', // Amharic → Ethiopia
  'ne': 'NP', // Nepali → Nepal
  'si': 'LK', // Sinhala → Sri Lanka
  'bn': 'BD', // Bengali → Bangladesh
  'ur': 'PK', // Urdu → Pakistan
  'fa': 'IR', // Persian → Iran
  'he': 'IL', // Hebrew → Israel
  
  // Middle Eastern & African Languages
  'ar': 'SA', // Arabic → Saudi Arabia (default, could also be AE, EG, etc.)
  'tr': 'TR', // Turkish → Turkey
  'ru': 'RU', // Russian → Russia
  'uk': 'UA', // Ukrainian → Ukraine
  'be': 'BY', // Belarusian → Belarus
  'kk': 'KZ', // Kazakh → Kazakhstan
  'ky': 'KG', // Kyrgyz → Kyrgyzstan
  'uz': 'UZ', // Uzbek → Uzbekistan
  'az': 'AZ', // Azerbaijani → Azerbaijan
  'hy': 'AM', // Armenian → Armenia
  'sw': 'TZ', // Swahili → Tanzania
  'yo': 'NG', // Yoruba → Nigeria
  'ha': 'NG', // Hausa → Nigeria
  'ig': 'NG', // Igbo → Nigeria
  'af': 'ZA', // Afrikaans → South Africa
  'zu': 'ZA', // Zulu → South Africa
  'xh': 'ZA', // Xhosa → South Africa
  
  // English variants (default to US)
  'en': 'US', // English → United States (could also be GB, AU, CA)
  
  // Spanish variants
  'es-mx': 'MX', // Mexican Spanish → Mexico
  'es-ar': 'AR', // Argentinian Spanish → Argentina
  'es-co': 'CO', // Colombian Spanish → Colombia
  'es-cl': 'CL', // Chilean Spanish → Chile
  'es-pe': 'PE', // Peruvian Spanish → Peru
  'es-ve': 'VE', // Venezuelan Spanish → Venezuela
  
  // Portuguese variants
  'pt-br': 'BR', // Brazilian Portuguese → Brazil
  
  // French variants
  'fr-ca': 'CA', // Canadian French → Canada
  'fr-be': 'BE', // Belgian French → Belgium
  'fr-ch': 'CH', // Swiss French → Switzerland
  
  // Chinese variants
  'zh-cn': 'CN', // Simplified Chinese → China
  'zh-tw': 'TW', // Traditional Chinese → Taiwan
  'zh-hk': 'HK', // Hong Kong Chinese → Hong Kong
  
  // Other regional variants
  'de-at': 'AT', // Austrian German → Austria
  'de-ch': 'CH', // Swiss German → Switzerland
  'it-ch': 'CH', // Swiss Italian → Switzerland
  'ca': 'ES',    // Catalan → Spain (could also be AD for Andorra)
  'eu': 'ES',    // Basque → Spain
  'gl': 'ES',    // Galician → Spain
}

/**
 * Get the appropriate country code for a given language code
 * @param languageCode - ISO 639-1 language code (e.g., 'es', 'fr', 'de')
 * @returns ISO 3166-1 alpha-2 country code (e.g., 'ES', 'FR', 'DE')
 */
export function getCountryCodeFromLanguage(languageCode: string): string {
  if (!languageCode) {
    return 'US' // Default fallback
  }
  
  // Convert to lowercase and handle common variants
  const code = languageCode.toLowerCase().trim()
  
  // Check exact match first
  if (LANGUAGE_TO_COUNTRY_MAP[code]) {
    return LANGUAGE_TO_COUNTRY_MAP[code]
  }
  
  // If it's a variant like 'es-MX', try the base language
  if (code.includes('-')) {
    const baseLanguage = code.split('-')[0]
    if (LANGUAGE_TO_COUNTRY_MAP[baseLanguage]) {
      return LANGUAGE_TO_COUNTRY_MAP[baseLanguage]
    }
  }
  
  // Ultimate fallback to US
  return 'US'
}

/**
 * Get a human-readable description of the language and country
 * @param languageCode - ISO 639-1 language code
 * @returns Object with language name and country name
 */
export function getLanguageInfo(languageCode: string): { language: string; country: string } {
  const countryCode = getCountryCodeFromLanguage(languageCode)
  
  // Simple mapping for display purposes
  const languageNames: Record<string, string> = {
    'es': 'Spanish',
    'fr': 'French', 
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'ru': 'Russian',
    'hi': 'Hindi',
    'th': 'Thai',
    'vi': 'Vietnamese',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'en': 'English',
  }
  
  const countryNames: Record<string, string> = {
    'ES': 'Spain',
    'FR': 'France',
    'DE': 'Germany',
    'IT': 'Italy',
    'PT': 'Portugal',
    'JP': 'Japan',
    'KR': 'South Korea',
    'CN': 'China',
    'SA': 'Saudi Arabia',
    'RU': 'Russia',
    'IN': 'India',
    'TH': 'Thailand',
    'VN': 'Vietnam',
    'NL': 'Netherlands',
    'SE': 'Sweden',
    'US': 'United States',
  }
  
  const baseLanguage = languageCode.toLowerCase().split('-')[0]
  
  return {
    language: languageNames[baseLanguage] || languageCode.toUpperCase(),
    country: countryNames[countryCode] || countryCode
  }
}