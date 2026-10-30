import { MinorAmount } from '../types';

/**
 * Format integer paise into INR formatted string with Indian grouping (lakh/crore).
 * Example: 8000000 paise -> "₹80,000" or "₹80,000.50"
 */
export function formatINR(paise: MinorAmount, showPaise = false): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainingPaise = absPaise % 100;

  // Indian number grouping (last 3 digits, then groups of 2)
  const rupeesStr = rupees.toString();
  let lastThree = rupeesStr.substring(rupeesStr.length - 3);
  const otherNumbers = rupeesStr.substring(0, rupeesStr.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedRupees = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  let result = `₹${formattedRupees}`;
  if (showPaise && remainingPaise > 0) {
    result += `.${remainingPaise.toString().padStart(2, '0')}`;
  }

  return isNegative ? `-${result}` : result;
}

export function rupeesToPaise(rupees: number): MinorAmount {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: MinorAmount): number {
  return paise / 100;
}
