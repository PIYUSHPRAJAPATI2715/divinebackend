/**
 * Utility functions for robust phone number handling across Divine Platform
 * Handles formats: '9889868678', '+91 9889868678', '+919889868678', '919889868678', '09889868678', etc.
 */

const normalizePhone = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/[^0-9]/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
};

const getPhoneVariants = (phone) => {
  if (!phone) return [];
  const raw = String(phone).trim();
  const digits = raw.replace(/[^0-9]/g, '');
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  const variants = new Set([
    raw,
    raw.replace(/\s+/g, ''),
    digits,
    last10,
    `+91${last10}`,
    `+91 ${last10}`,
    `91${last10}`,
    `91 ${last10}`,
    `0${last10}`,
    `+91-${last10}`
  ]);
  return Array.from(variants).filter(Boolean);
};

const buildPhoneFilter = (phone) => {
  if (!phone) return { phone: null };
  const variants = getPhoneVariants(phone);
  const last10 = normalizePhone(phone);
  if (!last10) {
    return { phone: String(phone).trim() };
  }
  return {
    $or: [
      { phone: { $in: variants } },
      { phone: new RegExp(`${last10}$`) }
    ]
  };
};

const findUserByPhone = async (phone, User) => {
  if (!phone || !User) return null;
  const filter = buildPhoneFilter(phone);
  return await User.findOne(filter).sort({ isProfileComplete: -1, updatedAt: -1 });
};

module.exports = {
  normalizePhone,
  getPhoneVariants,
  buildPhoneFilter,
  findUserByPhone
};
