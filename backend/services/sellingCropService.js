const prioritizedSellingCrops = [
  'Tomato',
  'Onion',
  'Potato',
  'Rice',
  'Paddy(Common)',
  'Maize',
  'Ragi(Finger Millet)',
  'Jowar(Sorghum)',
  'Wheat',
  'Groundnut',
  'Arecanut(Betelnut/Supari)',
  'Cotton',
  'Beans',
  'Brinjal',
  'Green Chilli',
  'Ladies Finger',
  'Cabbage',
  'Cauliflower',
  'Carrot',
  'Beetroot',
  'Cucumbar(Kheera)',
  'Bitter gourd',
  'Ridgeguard(Tori)',
  'Snakeguard',
  'Bottle gourd',
  'Drumstick',
  'Capsicum',
  'Green Gram(Moong)(Whole)',
  'Black Gram(Urd Beans)(Whole)',
  'Red gram/Arhar/Tur(whole)',
  'Bengal Gram(Gram)(Whole)',
  'Soyabean',
  'Sunflower/Sunflower Seed',
  'Coconut',
  'Black pepper',
  'Ginger(Green)',
  'Turmeric',
  'Banana',
  'Tender Coconut',
  'Sweet Potato',
  'Alasande Gram',
  'Alsandikai',
  'Foxtail Millet(Navane)',
  'Kulthi(Horse Gram)',
  'Knool Khol',
  'Seemebadnekai',
  'Thondekai',
  'Thogrikai',
  'Green Avare(W)',
  'Avare Dal',
  'Coriander(Leaves)',
  'Corriander seed',
  'Niger Seed(Ramtil)',
  'Chapparad Avare',
  'Ground Nut Seed',
  'Bajra(Pearl Millet/Cumbu)',
  'Safflower',
  'Garlic',
  'Sweet Pumpkin',
  'Water Melon',
  'Pineapple',
  'Pomegranate',
  'Raddish',
  'Gur(Jaggery)',
  'Copra',
  'Apple',
  'Sesamum(Sesame,Gingelly,Til)',
  'Mousambi(Sweet Lime)',
  'Elephant Yam(Suran)/Amorphophallus',
  'Bengal Gram Dal(Chana Dal)',
  'Karbuja(Musk Melon)',
  'Papaya',
  'Black Gram Dal(Urd Dal)',
  'Chikoos(Sapota)',
  'Bunch Beans',
  'Chilly Capsicum',
  'Mustard',
  'Dry Chillies',
  'Orange',
  'Lime',
  'Banana - Green',
  'Grapes',
  'Cowpea(Lobia/Karamani)',
  'Cowpea(Veg)',
  'Dry Grapes',
  'Ginger(Dry)',
  'Green Gram Dal(Moong Dal)',
  'Green Peas',
  'Guava',
  'Mataki',
  'Methi Seeds',
  'Peas Wet',
  'Tamarind Fruit',
  'White Pumpkin',
];
const SELLING_CROP_LIMIT = 97;
const sellingCropPriority = new Map(
  prioritizedSellingCrops.map((cropName, index) => [
    normalizeCropName(cropName),
    index,
  ]),
);

function normalizeCropName(name) {
  return String(name || '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function selectSellingCrops(crops, limit = SELLING_CROP_LIMIT) {
  const uniqueCrops = new Map();
  for (const crop of crops) {
    const key = normalizeCropName(crop.name);
    const existing = uniqueCrops.get(key);
    if (!existing || (crop.marketCount || 0) > (existing.marketCount || 0)) {
      uniqueCrops.set(key, crop);
    }
  }

  return [...uniqueCrops.values()]
    .sort((a, b) => {
      const aPriority = sellingCropPriority.get(normalizeCropName(a.name));
      const bPriority = sellingCropPriority.get(normalizeCropName(b.name));
      if (aPriority !== undefined || bPriority !== undefined) {
        if (aPriority === undefined) return 1;
        if (bPriority === undefined) return -1;
        return aPriority - bPriority;
      }
      return (b.marketCount || 0) - (a.marketCount || 0)
        || a.name.localeCompare(b.name);
    })
    .slice(0, Math.max(0, limit))
    .map(({ id, name }) => ({ id, name }));
}

module.exports = {
  normalizeCropName,
  selectSellingCrops,
  SELLING_CROP_LIMIT,
};
