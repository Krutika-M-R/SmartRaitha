const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tomato = await prisma.crop.create({ data: { name: 'Tomato' } });
  await prisma.crop.create({ data: { name: 'Onion' } });

  const mandiA = await prisma.mandi.create({
    data: { name: 'Kolar Mandi', state: 'Karnataka', district: 'Kolar' }
  });
  const mandiB = await prisma.mandi.create({
    data: { name: 'Bangalore Mandi', state: 'Karnataka', district: 'Bengaluru Urban' }
  });

  await prisma.price.create({
    data: {
      cropId: tomato.id,
      mandiId: mandiA.id,
      minPrice: 20,
      maxPrice: 26,
      modalPrice: 24,
      date: new Date()
    }
  });
  await prisma.price.create({
    data: {
      cropId: tomato.id,
      mandiId: mandiB.id,
      minPrice: 24,
      maxPrice: 30,
      modalPrice: 28,
      date: new Date()
    }
  });

  await prisma.transportationCost.create({
    data: { mandiId: mandiA.id, distanceKm: 20, ratePerKm: 10, estimatedCost: 200 }
  });
  await prisma.transportationCost.create({
    data: { mandiId: mandiB.id, distanceKm: 70, ratePerKm: 10, estimatedCost: 700 }
  });

  console.log('Seed data created successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
