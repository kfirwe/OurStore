// paymentHelper.js

// Validate card number using Luhn Algorithm
function validateCardNumber(cardNumber) {
  const regex = /^\d{16}$/; // Check if it's 16 digits
  if (!regex.test(cardNumber)) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i]);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function validateExpiryDate(expiryDate) {
  const [month, year] = expiryDate.split("/");
  if (!month || !year || month.length !== 2 || year.length !== 2) return false;

  const currentYear = new Date().getFullYear() % 100;
  const currentMonth = new Date().getMonth() + 1;

  if (
    parseInt(year) < currentYear ||
    (parseInt(year) === currentYear && parseInt(month) < currentMonth)
  ) {
    return false;
  }

  return true;
}

function validateCVV(cvv) {
  return /^\d{3,4}$/.test(cvv); // Validate CVV (3 or 4 digits)
}

module.exports = {
  validateCardNumber,
  validateExpiryDate,
  validateCVV,
};
