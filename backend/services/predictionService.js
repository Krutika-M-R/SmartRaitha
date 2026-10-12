const prisma = require('../config/prisma');

// Called after your Python (scikit-learn) service returns a predicted price.
// This just persists it — it does not run the ML model itself.
async function savePrediction({ cropId, mandiId, predictedDate, predictedPrice, modelVersion }) {
  return prisma.prediction.create({
    data: {
      cropId: Number(cropId),
      mandiId: Number(mandiId),
      predictedDate: new Date(predictedDate),
      predictedPrice: Number(predictedPrice),
      modelVersion: modelVersion || null
    }
  });
}

// GET-friendly helper: latest prediction for a crop/mandi pair
async function getLatestPrediction({ cropId, mandiId }) {
  return prisma.prediction.findFirst({
    where: { cropId: Number(cropId), mandiId: Number(mandiId) },
    orderBy: { createdAt: 'desc' }
  });
}

module.exports = { savePrediction, getLatestPrediction };
