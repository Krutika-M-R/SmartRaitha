const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const cropNames = ['Tomato', 'Onion', 'Potato', 'Chilli', 'Cotton', 'Groundnut', 'Rice', 'Maize'];

const mandis = [
  { name: 'Bangalore Mandi', state: 'Karnataka', district: 'Bengaluru Urban', latitude: 12.9716, longitude: 77.5946 },
  { name: 'Kolar Mandi', state: 'Karnataka', district: 'Kolar', latitude: 13.1367, longitude: 78.1297 },
  { name: 'Mysuru Mandi', state: 'Karnataka', district: 'Mysuru', latitude: 12.2958, longitude: 76.6394 },
  { name: 'Hubballi Mandi', state: 'Karnataka', district: 'Dharwad', latitude: 15.3647, longitude: 75.1240 },
  { name: 'Mangaluru Mandi', state: 'Karnataka', district: 'Dakshina Kannada', latitude: 13.0827, longitude: 74.8497 },
  { name: 'Belagavi Mandi', state: 'Karnataka', district: 'Belagavi', latitude: 15.8497, longitude: 74.4977 },
  { name: 'Tumakuru Mandi', state: 'Karnataka', district: 'Tumakuru', latitude: 13.3392, longitude: 76.1021 },
];

const cropBasePrices = {
  Tomato: [24, 22, 26, 30, 28, 27, 25],
  Onion: [18, 16, 17, 20, 19, 21, 18],
  Potato: [21, 20, 23, 24, 22, 25, 21],
  Chilli: [38, 35, 40, 44, 42, 41, 39],
  Cotton: [55, 52, 58, 60, 57, 59, 56],
  Groundnut: [42, 40, 44, 48, 46, 47, 43],
  Rice: [28, 26, 30, 32, 29, 31, 28],
  Maize: [19, 18, 22, 23, 21, 20, 19],
};

async function main() {
  for (const cropName of cropNames) {
    await prisma.crop.upsert({
      where: { name: cropName },
      update: {},
      create: { name: cropName },
    });
  }

  const createdMandis = [];
  for (const mandi of mandis) {
    const existing = await prisma.mandi.findFirst({
      where: { name: mandi.name, state: mandi.state },
    });

    const created = existing
      ? await prisma.mandi.update({
          where: { id: existing.id },
          data: { district: mandi.district, latitude: mandi.latitude, longitude: mandi.longitude },
        })
      : await prisma.mandi.create({ data: mandi });

    createdMandis.push(created);
  }

  const allCrops = await prisma.crop.findMany();
  const cropMap = new Map(allCrops.map((crop) => [crop.name, crop]));

  for (const cropName of cropNames) {
    const crop = cropMap.get(cropName);
    for (const [index, mandi] of createdMandis.entries()) {
      const modalPrice = cropBasePrices[cropName][index];
      const minPrice = Math.max(5, Math.round(modalPrice * 0.8));
      const maxPrice = Math.round(modalPrice * 1.18);
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);

      const existingPrice = await prisma.price.findFirst({
        where: {
          cropId: crop.id,
          mandiId: mandi.id,
          date: dayStart,
        },
      });

      if (existingPrice) {
        await prisma.price.update({
          where: { id: existingPrice.id },
          data: { minPrice, maxPrice, modalPrice },
        });
      } else {
        await prisma.price.create({
          data: {
            cropId: crop.id,
            mandiId: mandi.id,
            minPrice,
            maxPrice,
            modalPrice,
            date: dayStart,
          },
        });
      }
    }
  }

  const transportDistances = {
    'Bangalore Mandi': 12,
    'Kolar Mandi': 58,
    'Mysuru Mandi': 150,
    'Hubballi Mandi': 410,
    'Mangaluru Mandi': 355,
    'Belagavi Mandi': 430,
    'Tumakuru Mandi': 72,
  };

  for (const mandi of createdMandis) {
    const distanceKm = transportDistances[mandi.name] ?? 80;
    const ratePerKm = distanceKm < 100 ? 12 : distanceKm < 250 ? 10 : 8;
    const estimatedCost = distanceKm * ratePerKm;

    const existingTransport = await prisma.transportationCost.findFirst({
      where: { mandiId: mandi.id },
    });

    if (existingTransport) {
      await prisma.transportationCost.update({
        where: { id: existingTransport.id },
        data: { distanceKm, ratePerKm, estimatedCost },
      });
    } else {
      await prisma.transportationCost.create({
        data: { mandiId: mandi.id, distanceKm, ratePerKm, estimatedCost },
      });
    }
  }

  console.log('Seed data created successfully with Karnataka mandis and multiple crops.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
