const express = require('express');
const router = express.Router();

const requireAuth = require('../middleware/auth');
const authController = require('../controllers/authController');
const cropController = require('../controllers/cropController');
const mandiController = require('../controllers/mandiController');
const priceController = require('../controllers/priceController');
const profitController = require('../controllers/profitController');
const recommendationController = require('../controllers/recommendationController');
const predictionController = require('../controllers/predictionController');
const assistantController = require('../controllers/assistantController');
const farmGuidanceController = require('../controllers/farmGuidanceController');
const cropPlannerController = require('../controllers/cropPlannerController');

// Auth
router.post('/auth/signup', authController.signup);
router.post('/auth/verify-code', authController.verifyCode);
router.post('/auth/password-reset/request', authController.requestPasswordReset);
router.post('/auth/password-reset/confirm', authController.confirmPasswordReset);
router.post('/auth/login', authController.login);
router.post('/auth/google', authController.googleLogin);
router.get('/auth/me', requireAuth, authController.me);
router.put('/auth/profile', requireAuth, authController.updateProfile);
router.post('/assistant', requireAuth, assistantController.askAssistant);
router.get('/farm-guidance', requireAuth, farmGuidanceController.getGuidance);
router.get('/farm-guidance/seasonal', requireAuth, farmGuidanceController.getSeasonalGuidance);
router.get('/farm-guidance/planner', requireAuth, cropPlannerController.getPlan);

// Crops & Mandis
router.get('/crops', cropController.getCrops);
router.get('/crops/catalog', cropController.getCropCatalog);
router.get('/mandis', mandiController.getMandis);

// Prices
router.get('/prices', priceController.getPricesForCrop);
router.get('/prices/live', priceController.getLivePrices);
router.get('/prices/history', priceController.getPriceHistory);

// Profit calculator
router.post('/profit/calculate', requireAuth, profitController.calculate);

// Recommendation
router.get('/recommendations', requireAuth, recommendationController.getRecommendation);

// Predictions
router.get('/predictions', predictionController.getLatest);
router.post('/predictions/generate', requireAuth, predictionController.generate);

module.exports = router;
