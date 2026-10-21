function normalizeMandiName(name) {
  const normalized = String(name || '')
    .toLocaleLowerCase()
    .replace(/\b(mandi|market|apmc)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
  const aliases = {
    bengaluru: 'bangalore',
    mysore: 'mysuru',
    hubli: 'hubballi',
    dharwad: 'hubballi',
    mangalore: 'mangaluru',
    belgaum: 'belagavi',
    tumkur: 'tumakuru',
  };
  return aliases[normalized] || normalized;
}

module.exports = { normalizeMandiName };
