/**
 * Advibe Unified Money & Currency Module
 * --------------------------------------
 * Base Currency: INR (Indian Rupee)
 * Base Storage: Integer Paise (1 INR = 100 paise)
 * Supported Currencies: INR, USD, EUR, GBP, AED, SGD, AUD, CAD, JPY, CHF
 */

export const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
];

// Fallback rates relative to 1 INR (1 INR = X target currency)
export const DEFAULT_RATES = {
  INR: 1.0,
  USD: 0.0119,
  EUR: 0.0110,
  GBP: 0.0094,
  AED: 0.0437,
  SGD: 0.0156,
  AUD: 0.0178,
  CAD: 0.0163,
  JPY: 1.78,
  CHF: 0.0104,
};

let currentRates = { ...DEFAULT_RATES };
let activeCurrency = localStorage.getItem('advibe_currency') || 'INR';
const listeners = new Set();

export function setExchangeRates(newRates) {
  if (newRates && typeof newRates === 'object') {
    currentRates = { ...currentRates, ...newRates };
    try {
      localStorage.setItem('advibe_fx_rates', JSON.stringify(currentRates));
    } catch (e) {}
  }
}

export function initStoredRates() {
  try {
    const stored = localStorage.getItem('advibe_fx_rates');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        currentRates = { ...currentRates, ...parsed };
      }
    }
  } catch (e) {}
}

initStoredRates();

export async function fetchLatestFxRates(apiBaseUrl = 'http://localhost:8000') {
  try {
    const res = await fetch(`${apiBaseUrl}/api/v1/fx`);
    if (res.ok) {
      const data = await res.json();
      if (data?.rates) {
        setExchangeRates(data.rates);
        return data.rates;
      }
    }
  } catch (e) {
    // Non-blocking: continue with stored/fallback rates
  }
  return currentRates;
}

export function getActiveCurrency() {
  return activeCurrency;
}

export function setActiveCurrency(code) {
  if (SUPPORTED_CURRENCIES.some((c) => c.code === code)) {
    activeCurrency = code;
    try {
      localStorage.setItem('advibe_currency', code);
    } catch (e) {}
    listeners.forEach((fn) => fn(code));
  }
}

export function subscribeCurrency(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Converts an INR base amount into target currency using active rate.
 * @param {number} amountInINR - Value in INR
 * @param {string} targetCurrency - Target currency code
 */
export function convertFromINR(amountInINR, targetCurrency = activeCurrency) {
  const rate = currentRates[targetCurrency] || DEFAULT_RATES[targetCurrency] || 1.0;
  return amountInINR * rate;
}

/**
 * Converts a USD base amount (e.g. from international catalog) into INR.
 */
export function convertUSDToINR(amountInUSD) {
  const inrPerUSD = 1.0 / (currentRates.USD || DEFAULT_RATES.USD || 0.0119);
  return amountInUSD * inrPerUSD;
}

/**
 * Format money with Intl.NumberFormat.
 * @param {number} amountInBase - Amount in INR (or in paise if isPaise: true)
 * @param {string} currency - Currency code (defaults to activeCurrency)
 * @param {object} options - Options: isPaise, compact, decimals
 */
export function formatMoney(amountInBase, currency = activeCurrency, options = {}) {
  const { isPaise = false, compact = false, decimals = null } = options;
  if (amountInBase == null || isNaN(amountInBase)) return '—';

  const amountInINR = isPaise ? amountInBase / 100 : amountInBase;
  const rate = currentRates[currency] || DEFAULT_RATES[currency] || 1.0;
  const converted = amountInINR * rate;

  const isJPY = currency === 'JPY';
  const fracDigits = decimals !== null ? decimals : (isJPY ? 0 : (converted % 1 === 0 && compact ? 0 : 2));

  // Compact notation for large fund/company numbers (e.g., AUM, check sizes)
  if (compact) {
    if (currency === 'INR') {
      // Indian system: Lakhs & Crores
      if (converted >= 10000000) {
        return `₹${(converted / 10000000).toFixed(1).replace(/\.0$/, '')} Cr`;
      }
      if (converted >= 100000) {
        return `₹${(converted / 100000).toFixed(1).replace(/\.0$/, '')} L`;
      }
      if (converted >= 1000) {
        return `₹${(converted / 1000).toFixed(0)}k`;
      }
    } else {
      // Western system: Millions & Billions
      const sym = SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.symbol || currency + ' ';
      if (converted >= 1000000000) {
        return `${sym}${(converted / 1000000000).toFixed(1).replace(/\.0$/, '')}B`;
      }
      if (converted >= 1000000) {
        return `${sym}${(converted / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
      }
      if (converted >= 1000) {
        return `${sym}${(converted / 1000).toFixed(0)}k`;
      }
    }
  }

  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: isJPY ? 0 : (fracDigits > 0 ? fracDigits : 0),
      maximumFractionDigits: isJPY ? 0 : fracDigits,
    }).format(converted);
  } catch (e) {
    return `${currency} ${converted.toFixed(isJPY ? 0 : 2)}`;
  }
}
