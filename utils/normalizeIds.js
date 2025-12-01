const normalizeIds = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => {
      if (typeof v === 'object' && v._id) return v._id.toString();
      if (typeof v === 'object' && v.id) return v.id.toString();
      return v.toString();
    });
  }
  if (typeof value === 'object' && value._id) return [value._id.toString()];
  if (typeof value === 'object' && value.id) return [value.id.toString()];
  return [value.toString()];
};

module.exports = normalizeIds