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
const importController = require('../controllers/importController');
const assistantController = require('../controllers/assistantController');
const farmGuidanceController = require('../controllers/farmGuidanceController');

// Auth
router.post('/auth/signup', authController.signup);
router.post('/auth/login', authController.login);
router.post('/auth/verify-code', authController.verifyCode);
router.post('/auth/google', authController.googleLogin);
router.get('/auth/verify-email', authController.verifyEmail);
router.get('/auth/me', requireAuth, authController.me);
router.put('/auth/profile', requireAuth, authController.updateProfile);
router.post('/assistant', requireAuth, assistantController.askAssistant);
router.get('/farm-guidance', requireAuth, farmGuidanceController.getGuidance);

// Crops & Mandis
router.get('/crops', cropController.getCrops);
router.get('/mandis', mandiController.getMandis);

// Prices
router.get('/prices', priceController.getPricesForCrop);
router.get('/prices/history', priceController.getPriceHistory);

// Profit calculator
router.post('/profit/calculate', requireAuth, profitController.calculate);

// Recommendation
router.get('/recommendations', requireAuth, recommendationController.getRecommendation);

// Predictions (ML)
router.post('/predictions', requireAuth, predictionController.create);
router.get('/predictions', predictionController.getLatest);
router.post('/predictions/generate', requireAuth, predictionController.generate);

// Data import (Agmarknet). Keep this behind auth so random users can't trigger it.
router.post('/admin/import-prices', requireAuth, importController.runImport);

module.exports = router;
