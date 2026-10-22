import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = 'smartRaithaLanguage';

export const languages = [
  { code: 'en', label: 'English' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
];

const translations = {
  en: {
    language: 'Language', home: 'Home', profile: 'Profile', markets: 'Markets',
    profitCalculator: 'Profit Calculator', assistant: 'LittleLeaf', assistantHelp: 'Ask LittleLeaf for help',
    voiceOn: 'Voice on', voiceOff: 'Voice off', speak: 'Speak reply',
    whatSelling: 'What are you selling?', recommendedMarket: 'Recommended market',
    compareMarkets: 'Compare Markets', calculateProfit: 'Calculate Profit', selectMandi: 'Select mandi',
    quantityKg: 'Quantity (kg)', loadingMarkets: 'Loading markets...', fetchingPrices: 'Fetching mandi prices...',
    noPriceData: 'No Agmarknet price report was found in the latest data or saved snapshot for this crop.',
    notEnoughData: 'No Agmarknet mandi price data is available for this crop yet.',
    nationalCropFallback: 'No crops were returned for your state. Showing crops available across India; local prices may not be available.',
    noCropOptions: 'No crops are currently available from Agmarknet.',
    noLiveMandiPrices: 'No saved Agmarknet price report was found for this crop in your state. The app checks the latest CSV and database prices before showing this message.',
    noPriceDataForState: 'No Agmarknet price report was found in the latest data or saved snapshot for this crop in',
    modalPrice: 'Modal price', grossRevenue: 'Gross revenue', transportationCost: 'Transportation cost',
    otherCosts: 'Other costs', estimatedNetProfit: 'Estimated net profit', name: 'Name', email: 'Email',
    logOut: 'Log Out', askAssistant: 'Ask SmartRaitha anything',
    assistantPlaceholder: 'Ask about app features, crops, prices, or profit...', send: 'Send',
    assistantIntro: 'I can help you use SmartRaitha and answer questions about its features.',
    assistantUnavailable: 'The assistant is temporarily unavailable. Please try again.',
    goodMorning: 'Good morning', goodAfternoon: 'Good afternoon', goodEvening: 'Good evening', goodNight: 'Good night',
    personalizedGreeting: '{greeting}, {name}',
    loginSubtitle: 'Log in to continue', password: 'Password', confirmPassword: 'Confirm Password',
    logIn: 'Log In', signUp: 'Sign Up', createAccount: 'Create account',
    joinSmartRaitha: 'Join SmartRaitha to compare mandi prices',
    noAccount: "Don't have an account? Sign up", hasAccount: 'Already have an account? Log in',
    emailPlaceholder: 'you@example.com',
    gender: 'Gender', age: 'Age', place: 'Place', saveProfile: 'Save profile', profileSaved: 'Profile saved.',
    genderPlaceholder: 'e.g. Female', agePlaceholder: 'e.g. 35', placePlaceholder: 'Village, district or city',
    priceGraph: 'Price graph', bestMandiGraph: 'Best mandi price comparison', bestMandi: 'Best',
    priceAxis: 'Price (₹)', mandiAxis: 'Mandi', actionHint: 'Make your next selling decision with confidence.',
    help: "Today's weather", helpHint: 'Weather, seasons, and crop planning', weather: 'Weather for your farm',
    location: 'Location', futureForecast: 'Next 7 days', recommendedCrop: 'Weather-based crop suggestion',
    cultivateNow: 'Good crop to cultivate now', cropTiming: 'Best growing window',
    weatherUnavailable: 'Weather data is unavailable right now.', rain: 'Rain', humidity: 'Humidity', wind: 'Wind',
    seasonalGuide: 'Seasonal guide', chooseGuideMonth: 'Choose a month in the next six months for a location-based crop suggestion.',
    loadingSeasonalGuide: 'Finding crops suited to this month and location...', yourLocation: 'your location',
    seasonalGuideDisclaimer: 'Suggestions are based on regional seasonal patterns. Confirm suitability with local agriculture experts, soil, water, and seed availability before planting.',
    seasonalGuideLocationRequired: 'Enable location access to get a crop suggestion for your area.',
    clearSky: 'Clear sky', partlyCloudy: 'Partly cloudy', rainy: 'Rainy', snowy: 'Snowy',
    thunderstorm: 'Thunderstorm', mixedWeather: 'Mixed weather',
    to: 'to', latestAt: 'Latest at {mandi} · {date}',
    startingApp: 'Starting SmartRaitha...', loading: 'Loading...',
    locationPermissionDenied: 'Location permission denied. Enable it to get mandi recommendations near you.',
    locationUnavailable: 'Could not fetch your location.',
    requestFailed: 'The request could not be completed. Please try again.',
    recommendationNetReturn: 'Highest estimated net return for {quantity} kg from your current location after estimated road transport.',
    recommendationSavedReport: 'Using the latest saved Agmarknet report from {days} days ago.',
    recommendationBestDistrict: 'Best available latest Agmarknet price in your district, {district}. This comparison does not include transportation costs.',
    recommendationBestPrice: 'Highest latest reported Agmarknet modal price for {crop} in {state}. This comparison does not include transportation costs.',
    helpText: 'Use the weather and seasonal guide to plan sowing. Confirm with local agriculture officers before planting.',
    futurePrice: 'Future crop price', twoDayPrediction: 'Estimated price after 2 days',
    predictTwoDays: 'Predict 2-day prices', predicting: 'Predicting...', predictedOn: 'For',
    predictionUnavailable: 'Prediction service is unavailable. Start the ML service and try again.',
    marketHint: 'Compare the best prices across mandis', profitHint: 'Estimate earnings before you sell',
    recommendedHint: 'Highest latest reported modal price',
    forgotPassword: 'Forgot password?', resetPassword: 'Reset password',
    resetPasswordSubtitle: 'We’ll email you a one-time code to confirm it’s your account.',
    sendResetCode: 'Send reset code', emailVerificationCode: 'Email verification code', sixDigitCode: '6-digit code',
    resendCode: 'Resend code', newPassword: 'New password', changePassword: 'Change password',
    backToLogin: 'Back to login', verifyContinue: 'Verify and continue',
    pleaseEnterEmailPassword: 'Please enter your email and password.', fillAllFields: 'Please fill in all fields.',
    passwordMismatch: 'Passwords do not match.', sixDigitVerification: 'Enter the 6-digit verification code.',
    sixDigitReset: 'Enter the 6-digit reset code.', namePlaceholder: 'Your name',
    accountCreatedMessage: 'Account created. Log in with your email and password.',
    passwordChangedMessage: 'Password changed successfully. Log in with your new password.',
    verificationSent: 'We sent a verification code to {email}. Enter it below.',
    resetCodeSent: 'If a verified account exists, a reset code has been sent.',
    greetingFriend: 'Hiiii, fren! 💚🍃', assistantTagline: 'Your tiny corner of comfort. How can I help you today?',
    welcomeTagline: 'Every cost counted.\nEvery return considered.',
    moreOptions: 'More options', settings: 'Settings', goBack: 'Go back',
    openAssistant: 'Open LittleLeaf chatbot', anyHelp: 'Any Help? 🌱',
    searchCrops: 'Search available crops', searchCropsAccessibility: 'Search crops available to sell',
    clearCropSearch: 'Clear crop search', noSearchResults: 'No available crops match “{query}”.',
    selectCropForRecommendation: 'Select the crop for recommended market.',
    selectCropForMarketActions: 'Search for and select a crop above to compare markets or calculate profit.',
    selectCropAlertTitle: 'Select a crop', selectCropBeforeCompare: 'Search for and select a crop above before comparing markets.',
    selectCropBeforeProfit: 'Search for and select a crop above before calculating profit.',
    seasonalPlanning: 'Seasonal planning', cropPlannerTitle: 'Smart 6-Month Crop Planner',
    cropPlannerDescription: 'Explore suitable crops for your soil, irrigation, and sowing month.',
    findBestMandiProfit: 'Find best mandi by net profit',
    bestForQuantity: 'Best for {quantity} kg: {mandi} — estimated net ₹{profit} after about {distance} km road transport.',
    noPriceAvailable: 'No price available', savedDaysAgo: 'saved {days}d ago',
    savedPriceAge: 'Saved price is {days} days old',
    aboutDistanceAway: 'about {distance} km away', saved: 'saved',
    marketComparisonDisclaimer: 'Only live or saved prices reported for the selected mandi are used for comparison and profit.',
    exampleQuantity: 'e.g. 100', latestSavedPrice: 'Latest saved Agmarknet report: {date} ({days} days old)',
    drivingRouteAccessibility: 'Driving route to the selected mandi', yourLocationMarker: 'Your location',
    selectedMandiMarker: 'Selected mandi', osmAttribution: 'Route © OpenStreetMap contributors',
    modalPricePerKg: 'modal price', estimatedNetForQuantity: 'Estimated net for {quantity} kg after transport: ₹{profit}',
    approxRoadTransport: 'Approx. {distance} km by road · estimated transport ₹{cost}',
    savedAgmarknetAge: 'Using the latest saved Agmarknet price, reported {days} days ago.',
    agmarknetReport: 'Agmarknet report: {date}',
    plannerEyebrow: 'PLAN WITH CONFIDENCE', plannerSubtitle: 'Seasonal fit, local climate and nearby mandi records in one place.',
    choosePlanningPeriod: 'Choose a planning period', planStartsFirstMonth: 'Plan starts in first month',
    farmDetails: 'Your farm details', locationPlaceholder: 'Town, village, or district',
    planningFor: 'Planning for {place}', farmSize: 'Farm size', acres: 'acres',
    farmSizeAccessibility: 'Farm size in acres', soilType: 'Soil type', notSure: 'Not sure',
    soilRed: 'Red', soilBlack: 'Black', soilClay: 'Clay', soilSandy: 'Sandy', soilLoamy: 'Loamy', soilAlluvial: 'Alluvial',
    irrigation: 'Irrigation', irrigationRainfed: 'Rain-fed', irrigationBorewell: 'Borewell',
    irrigationCanal: 'Canal', irrigationDrip: 'Drip', cropPreferences: 'Crop preferences',
    optional: '(optional)', climate: '{region} · {date} climate',
    climateDetail: '{rain} mm average rain · {temperature}°C mean · {years}-year history',
    topCrops: 'Top 3 crops for {period}', rankedBy: 'Ranked by crop preferences, season and farm details',
    bestFit: '{score}% best fit', allowLocationOrSearch: 'Allow location access or search for your town to build a plan.',
    checkingClimate: 'Checking seasonal climate and nearby mandi data…',
    noCropProfiles: 'No crop profiles are available for this location yet.',
    bestMatch: 'BEST MATCH', fitScore: ' / 100 fit', growTime: 'Grow time', water: 'Water',
    yieldPerAcre: 'Yield / acre', sowingToHarvest: 'Sowing to harvest', sow: 'Sow',
    harvest: 'Harvest ~{date}', hideCropDetails: 'Hide crop details', viewCropDetails: 'View crop details',
    suitableSoil: 'Suitable soil', checkLocalAgricultureExpert: 'Check with your local agriculture expert.',
    suitableIrrigation: 'Suitable irrigation', chooseWaterAvailability: 'Choose based on local water availability.',
    whyCropMatches: 'Why this crop matches', nearbyMandiTrend: 'Nearby mandi trend',
    noNearbyPriceHistory: 'No nearby verified ₹/kg market history yet.',
    planningEstimate: 'Planning estimate · {size} acre{plural}', cultivationCost: 'Cultivation cost',
    potentialProfit: 'Potential profit',
    plannerFinanceDisclaimer: 'Uses a nearby recorded mandi price and the planner’s indicative yield/cost ranges. Actual results vary.',
    plannerProfitDataMissing: 'Profit needs a nearby mandi record with a verified ₹/kg unit. Import current market data to calculate it.',
    dayRange: '{start}–{end} days', waterLow: 'Low', waterMedium: 'Medium', waterHigh: 'High',
    waterLowMedium: 'Low to medium',
    reasonSowingWindow: 'The selected month matches a common sowing window for this crop.',
    reasonOutsideSowingWindow: 'This month is outside the crop’s main sowing window.',
    reasonRainfallFits: 'Historical rainfall for this month averages {rainfall} mm, within the crop’s planning range.',
    reasonIrrigationOffsetsRain: 'Irrigation can help offset the lower historical rainfall.',
    reasonCheckWater: 'Historical rainfall averages {rainfall} mm; check water availability and drainage.',
    reasonTemperatureFits: 'The historical monthly mean temperature ({temperature}°C) is in the crop’s planning range.',
    reasonTemperatureOutside: 'Historical monthly temperature is outside the crop’s preferred planning range.',
    reasonSoilNotSelected: 'Soil match is not included until you select a soil type.',
    reasonSoilSuitable: 'The selected soil type is suitable for this crop.',
    reasonSoilLessSuitable: 'The selected soil type is less suitable; consider a local soil test and expert advice.',
    reasonReliableWater: 'This crop needs reliable water; rain-fed cultivation may be risky.',
    reasonIrrigationSupports: 'Your irrigation selection supports this crop’s water needs.',
    reasonPreferenceMatch: 'This crop matches your selected preferences.',
    generalCropSuitability: 'Suitability considers season, climate, soil, irrigation, and your preferences.',
    enterTown: 'Enter a town, village, or district.',
    placeNotFound: 'Could not find that place. Try a nearby town or district.',
    localWaterAvailability: 'Choose based on local water availability.',
    noNearbyMandiHistory: 'No nearby verified ₹/kg market history yet.',
    currentReportedPrices: 'Here are the latest reported Agmarknet {crop} modal prices',
    reportedNotLive: 'These are reported prices, not guaranteed live quotes.',
    savedPricesFallback: 'Saved prices are shown when a newer live report is unavailable. Markets without any saved or live report cannot be compared for {crop}.',
    noReportForCrop: 'No Agmarknet report was found in the latest data or saved snapshot for {crop} in the listed mandis.',
    noCurrentCropPrice: 'No Agmarknet price is currently available for {crop}',
    savedReportThrough: 'Saved Agmarknet report through {date}',
    noStateFound: 'Could not identify your state. Allow location access and reopen market comparison.',
    noStateForProfit: 'Could not identify your state. Allow location access and reopen the profit calculator.',
    validQuantityBeforeCompare: 'Enter a valid quantity before comparing mandi profits.',
    locationNeededForProfit: 'Allow location access to compare net profit after transport.',
    noComparisonPrices: 'No Agmarknet price is available in the latest data or saved snapshot to compare profit.',
    selectMandiQuantity: 'Please select a mandi and enter a valid quantity.',
    locationNeededForRoute: 'Allow location access to estimate the route and transportation cost.',
    marketPriceFallback: 'No Agmarknet price report was found in the latest data or saved snapshot for this crop.',
    clear: 'Clear',
    marketNameFallback: 'Market', inState: 'in {state}.', modelVersion: 'Model: {version}',
    invalidName: 'Name must start with a letter and contain only letters.',
    invalidEmail: 'Please enter a valid email address.',
    passwordTooShort: 'Password must be at least 8 characters.',
    passwordNeedsNumber: 'Password must contain at least one number.',
    passwordNeedsSpecialCharacter: 'Password must contain at least one special character.',
  },
  kn: {
    language: 'ಭಾಷೆ', home: 'ಮುಖಪುಟ', profile: 'ಪ್ರೊಫೈಲ್', markets: 'ಮಾರುಕಟ್ಟೆಗಳು',
    profitCalculator: 'ಲಾಭ ಲೆಕ್ಕಾಚಾರ', assistant: 'ಲಿಟಲ್ ಲೀಫ್', assistantHelp: 'ಲಿಟಲ್ ಲೀಫ್‌ಗೆ ಸಹಾಯ ಕೇಳಿ',
    voiceOn: 'ಧ್ವನಿ ಆನ್', voiceOff: 'ಧ್ವನಿ ಆಫ್', speak: 'ಉತ್ತರವನ್ನು ಕೇಳಿ',
    whatSelling: 'ನೀವು ಏನು ಮಾರಾಟ ಮಾಡುತ್ತಿದ್ದೀರಿ?', recommendedMarket: 'ಶಿಫಾರಸು ಮಾಡಿದ ಮಾರುಕಟ್ಟೆ',
    compareMarkets: 'ಮಾರುಕಟ್ಟೆಗಳನ್ನು ಹೋಲಿಸಿ', calculateProfit: 'ಲಾಭ ಲೆಕ್ಕಿಸಿ', selectMandi: 'ಮಂಡಿ ಆಯ್ಕೆಮಾಡಿ',
    quantityKg: 'ಪ್ರಮಾಣ (ಕೆಜಿ)', loadingMarkets: 'ಮಾರುಕಟ್ಟೆಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...', fetchingPrices: 'ಮಂಡಿ ಬೆಲೆಗಳನ್ನು ಪಡೆಯಲಾಗುತ್ತಿದೆ...',
    noPriceData: 'ಈ ಬೆಳೆಗೆ ಇತ್ತೀಚಿನ ಡೇಟಾ ಅಥವಾ ಉಳಿಸಿದ ಸ್ನ್ಯಾಪ್‌ಶಾಟ್‌ನಲ್ಲಿ Agmarknet ಬೆಲೆ ವರದಿ ಕಂಡುಬಂದಿಲ್ಲ.',
    notEnoughData: 'ಈ ಬೆಳೆಗೆ Agmarknet ಮಂಡಿ ಬೆಲೆ ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ.',
    nationalCropFallback: 'ನಿಮ್ಮ ರಾಜ್ಯಕ್ಕೆ ಬೆಳೆಗಳು ಲಭ್ಯವಿಲ್ಲ. ಭಾರತದಾದ್ಯಂತ ಲಭ್ಯವಿರುವ ಬೆಳೆಗಳನ್ನು ತೋರಿಸಲಾಗಿದೆ; ಸ್ಥಳೀಯ ಬೆಲೆಗಳು ಇಲ್ಲದಿರಬಹುದು.',
    noCropOptions: 'ಪ್ರಸ್ತುತ Agmarknet ನಿಂದ ಬೆಳೆಗಳು ಲಭ್ಯವಿಲ್ಲ.',
    noLiveMandiPrices: 'ನಿಮ್ಮ ರಾಜ್ಯದಲ್ಲಿ ಈ ಬೆಳೆಗೆ ಉಳಿಸಿದ Agmarknet ಬೆಲೆ ವರದಿ ಕಂಡುಬಂದಿಲ್ಲ. ಈ ಸಂದೇಶದ ಮೊದಲು ಆ್ಯಪ್ ಇತ್ತೀಚಿನ CSV ಮತ್ತು ಡೇಟಾಬೇಸ್ ಬೆಲೆಗಳನ್ನು ಪರಿಶೀಲಿಸುತ್ತದೆ.',
    noPriceDataForState: 'ಈ ರಾಜ್ಯದಲ್ಲಿ ಈ ಬೆಳೆಗೆ ಇತ್ತೀಚಿನ ಡೇಟಾ ಅಥವಾ ಉಳಿಸಿದ ಸ್ನ್ಯಾಪ್‌ಶಾಟ್‌ನಲ್ಲಿ Agmarknet ಬೆಲೆ ವರದಿ ಕಂಡುಬಂದಿಲ್ಲ:',
    modalPrice: 'ಮಾದರಿ ಬೆಲೆ', grossRevenue: 'ಒಟ್ಟು ಆದಾಯ', transportationCost: 'ಸಾರಿಗೆ ವೆಚ್ಚ',
    otherCosts: 'ಇತರೆ ವೆಚ್ಚಗಳು', estimatedNetProfit: 'ಅಂದಾಜು ನಿವ್ವಳ ಲಾಭ', name: 'ಹೆಸರು', email: 'ಇಮೇಲ್',
    logOut: 'ಲಾಗ್ ಔಟ್', askAssistant: 'SmartRaitha ಗೆ ಏನಾದರೂ ಕೇಳಿ',
    assistantPlaceholder: 'ಆಪ್ ವೈಶಿಷ್ಟ್ಯಗಳು, ಬೆಳೆ, ಬೆಲೆ ಅಥವಾ ಲಾಭದ ಬಗ್ಗೆ ಕೇಳಿ...', send: 'ಕಳುಹಿಸಿ',
    assistantIntro: 'SmartRaitha ಬಳಸಲು ಮತ್ತು ಅದರ ವೈಶಿಷ್ಟ್ಯಗಳ ಬಗ್ಗೆ ಪ್ರಶ್ನೆಗಳಿಗೆ ನಾನು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ.',
    assistantUnavailable: 'ಸಹಾಯಕ ಈಗ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    goodMorning: 'ಶುಭೋದಯ', goodAfternoon: 'ಶುಭ ಮಧ್ಯಾಹ್ನ', goodEvening: 'ಶುಭ ಸಂಜೆ', goodNight: 'ಶುಭ ರಾತ್ರಿ',
    personalizedGreeting: '{name}, {greeting}',
    loginSubtitle: 'ಮುಂದುವರಿಯಲು ಲಾಗಿನ್ ಮಾಡಿ', password: 'ಪಾಸ್‌ವರ್ಡ್', confirmPassword: 'ಪಾಸ್‌ವರ್ಡ್ ದೃಢೀಕರಿಸಿ',
    logIn: 'ಲಾಗಿನ್', signUp: 'ಸೈನ್ ಅಪ್', createAccount: 'ಖಾತೆ ರಚಿಸಿ',
    joinSmartRaitha: 'ಮಂಡಿ ಬೆಲೆಗಳನ್ನು ಹೋಲಿಸಲು SmartRaitha ಗೆ ಸೇರಿ',
    noAccount: 'ಖಾತೆ ಇಲ್ಲವೇ? ಸೈನ್ ಅಪ್ ಮಾಡಿ', hasAccount: 'ಈಗಾಗಲೇ ಖಾತೆ ಇದೆಯೇ? ಲಾಗಿನ್ ಮಾಡಿ',
    emailPlaceholder: 'ನಿಮ್ಮ ಇಮೇಲ್',
    gender: 'ಲಿಂಗ', age: 'ವಯಸ್ಸು', place: 'ಸ್ಥಳ', saveProfile: 'ಪ್ರೊಫೈಲ್ ಉಳಿಸಿ', profileSaved: 'ಪ್ರೊಫೈಲ್ ಉಳಿಸಲಾಗಿದೆ.',
    genderPlaceholder: 'ಉದಾ. ಮಹಿಳೆ', agePlaceholder: 'ಉದಾ. 35', placePlaceholder: 'ಗ್ರಾಮ, ಜಿಲ್ಲೆ ಅಥವಾ ನಗರ',
    priceGraph: 'ಬೆಲೆ ಗ್ರಾಫ್', bestMandiGraph: 'ಅತ್ಯುತ್ತಮ ಮಂಡಿ ಬೆಲೆ ಹೋಲಿಕೆ', bestMandi: 'ಅತ್ಯುತ್ತಮ',
    priceAxis: 'ಬೆಲೆ (₹)', mandiAxis: 'ಮಂಡಿ', actionHint: 'ವಿಶ್ವಾಸದಿಂದ ನಿಮ್ಮ ಮುಂದಿನ ಮಾರಾಟದ ನಿರ್ಧಾರ ತೆಗೆದುಕೊಳ್ಳಿ.',
    help: 'ಇಂದಿನ ಹವಾಮಾನ', helpHint: 'ಹವಾಮಾನ, ಋತುಗಳು ಮತ್ತು ಬೆಳೆ ಯೋಜನೆ', weather: 'ನಿಮ್ಮ ಕೃಷಿ ಜಮೀನಿನ ಹವಾಮಾನ',
    location: 'ಸ್ಥಳ', futureForecast: 'ಮುಂದಿನ 7 ದಿನಗಳು', recommendedCrop: 'ಹವಾಮಾನ ಆಧಾರಿತ ಬೆಳೆ ಸಲಹೆ',
    cultivateNow: 'ಈಗ ಬೆಳೆಯಲು ಸೂಕ್ತವಾದ ಬೆಳೆ', cropTiming: 'ಉತ್ತಮ ಬೆಳೆಯುವ ಅವಧಿ',
    weatherUnavailable: 'ಈಗ ಹವಾಮಾನ ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ.', rain: 'ಮಳೆ', humidity: 'ತೇವಾಂಶ', wind: 'ಗಾಳಿ',
    seasonalGuide: 'ಋತುಮಾನ ಮಾರ್ಗದರ್ಶಿ', chooseGuideMonth: 'ಸ್ಥಳ ಆಧಾರಿತ ಬೆಳೆ ಸಲಹೆಗೆ ಮುಂದಿನ ಆರು ತಿಂಗಳಲ್ಲಿ ಒಂದು ತಿಂಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ.',
    loadingSeasonalGuide: 'ಈ ತಿಂಗಳು ಮತ್ತು ಸ್ಥಳಕ್ಕೆ ಸೂಕ್ತ ಬೆಳೆಗಳನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ...', yourLocation: 'ನಿಮ್ಮ ಸ್ಥಳ',
    seasonalGuideDisclaimer: 'ಸಲಹೆಗಳು ಪ್ರಾದೇಶಿಕ ಋತುಮಾನದ ಮಾದರಿಗಳನ್ನು ಆಧರಿಸಿವೆ. ಬಿತ್ತುವ ಮೊದಲು ಸ್ಥಳೀಯ ಕೃಷಿ ತಜ್ಞರು, ಮಣ್ಣು, ನೀರು ಮತ್ತು ಬೀಜಗಳ ಲಭ್ಯತೆಯೊಂದಿಗೆ ಸೂಕ್ತತೆಯನ್ನು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.',
    seasonalGuideLocationRequired: 'ನಿಮ್ಮ ಪ್ರದೇಶಕ್ಕೆ ಬೆಳೆ ಸಲಹೆ ಪಡೆಯಲು ಸ್ಥಳ ಪ್ರವೇಶವನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ.',
    clearSky: 'ನಿರ್ಮಲ ಆಕಾಶ', partlyCloudy: 'ಭಾಗಶಃ ಮೋಡ ಕವಿದಿದೆ', rainy: 'ಮಳೆಯ ವಾತಾವರಣ',
    snowy: 'ಹಿಮಪಾತ', thunderstorm: 'ಗುಡುಗು ಸಹಿತ ಮಳೆ', mixedWeather: 'ಮಿಶ್ರ ಹವಾಮಾನ',
    to: 'ರಿಂದ', latestAt: '{mandi}ಯಲ್ಲಿ ಇತ್ತೀಚಿನ ಬೆಲೆ · {date}',
    startingApp: 'SmartRaitha ಪ್ರಾರಂಭವಾಗುತ್ತಿದೆ...', loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    locationPermissionDenied: 'ಸ್ಥಳ ಪ್ರವೇಶ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ. ಹತ್ತಿರದ ಮಂಡಿ ಶಿಫಾರಸುಗಳಿಗಾಗಿ ಅನುಮತಿ ನೀಡಿ.',
    locationUnavailable: 'ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ಪಡೆಯಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.',
    requestFailed: 'ವಿನಂತಿಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    recommendationNetReturn: 'ಅಂದಾಜು ರಸ್ತೆ ಸಾರಿಗೆ ವೆಚ್ಚದ ನಂತರ ನಿಮ್ಮ ಸ್ಥಳದಿಂದ {quantity} ಕೆಜಿಗೆ ಅತಿ ಹೆಚ್ಚು ಅಂದಾಜು ನಿವ್ವಳ ಆದಾಯ.',
    recommendationSavedReport: 'ಇತ್ತೀಚಿನ ಉಳಿಸಿದ Agmarknet ವರದಿಯನ್ನು ಬಳಸಲಾಗಿದೆ; ಅದು {days} ದಿನಗಳ ಹಿಂದಿನದು.',
    recommendationBestDistrict: 'ನಿಮ್ಮ ಜಿಲ್ಲೆಯಲ್ಲಿ ಇತ್ತೀಚಿನ ಲಭ್ಯವಿರುವ ಅತ್ಯುತ್ತಮ Agmarknet ಬೆಲೆ, {district}. ಈ ಹೋಲಿಕೆಯಲ್ಲಿ ಸಾರಿಗೆ ವೆಚ್ಚ ಸೇರಿಲ್ಲ.',
    recommendationBestPrice: '{state}ನಲ್ಲಿ {crop}ಗೆ ವರದಿಯಾದ ಇತ್ತೀಚಿನ ಅತಿ ಹೆಚ್ಚು Agmarknet ಮಾದರಿ ಬೆಲೆ. ಈ ಹೋಲಿಕೆಯಲ್ಲಿ ಸಾರಿಗೆ ವೆಚ್ಚ ಸೇರಿಲ್ಲ.',
    helpText: 'ಬಿತ್ತನೆ ಯೋಜಿಸಲು ಹವಾಮಾನ ಮತ್ತು ಋತುಮಾನ ಮಾರ್ಗದರ್ಶಿ ಬಳಸಿ. ಬಿತ್ತುವ ಮೊದಲು ಸ್ಥಳೀಯ ಕೃಷಿ ಅಧಿಕಾರಿಗಳೊಂದಿಗೆ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.',
    futurePrice: 'ಭವಿಷ್ಯದ ಬೆಳೆ ಬೆಲೆ', twoDayPrediction: '2 ದಿನಗಳ ನಂತರದ ಅಂದಾಜು ಬೆಲೆ',
    predictTwoDays: '2 ದಿನಗಳ ಬೆಲೆ ಅಂದಾಜಿಸಿ', predicting: 'ಅಂದಾಜಿಸಲಾಗುತ್ತಿದೆ...', predictedOn: 'ದಿನಾಂಕ',
    predictionUnavailable: 'ಬೆಲೆ ಅಂದಾಜು ಸೇವೆ ಲಭ್ಯವಿಲ್ಲ. ML ಸೇವೆಯನ್ನು ಪ್ರಾರಂಭಿಸಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    marketHint: 'ಮಂಡಿಗಳಲ್ಲಿನ ಉತ್ತಮ ಬೆಲೆಗಳನ್ನು ಹೋಲಿಸಿ', profitHint: 'ಮಾರಾಟಕ್ಕೂ ಮೊದಲು ಆದಾಯ ಅಂದಾಜಿಸಿ',
    recommendedHint: 'ಇತ್ತೀಚಿನ ವರದಿಯ ಅತಿ ಹೆಚ್ಚು ಮಾದರಿ ಬೆಲೆ',
    forgotPassword: 'ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?', resetPassword: 'ಪಾಸ್‌ವರ್ಡ್ ಮರುಹೊಂದಿಸಿ',
    resetPasswordSubtitle: 'ಇದು ನಿಮ್ಮ ಖಾತೆಯೇ ಎಂದು ಖಚಿತಪಡಿಸಲು ಒಂದು ಬಾರಿ ಬಳಸುವ ಕೋಡ್ ಅನ್ನು ಇಮೇಲ್ ಮಾಡುತ್ತೇವೆ.',
    sendResetCode: 'ಮರುಹೊಂದಿಸುವ ಕೋಡ್ ಕಳುಹಿಸಿ', emailVerificationCode: 'ಇಮೇಲ್ ಪರಿಶೀಲನಾ ಕೋಡ್', sixDigitCode: '6 ಅಂಕಿಯ ಕೋಡ್',
    resendCode: 'ಕೋಡ್ ಮತ್ತೆ ಕಳುಹಿಸಿ', newPassword: 'ಹೊಸ ಪಾಸ್‌ವರ್ಡ್', changePassword: 'ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಿ',
    backToLogin: 'ಲಾಗಿನ್‌ಗೆ ಹಿಂತಿರುಗಿ', verifyContinue: 'ಪರಿಶೀಲಿಸಿ ಮುಂದುವರಿಸಿ',
    pleaseEnterEmailPassword: 'ನಿಮ್ಮ ಇಮೇಲ್ ಮತ್ತು ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ.', fillAllFields: 'ಎಲ್ಲಾ ಮಾಹಿತಿಯನ್ನು ಭರ್ತಿ ಮಾಡಿ.',
    passwordMismatch: 'ಪಾಸ್‌ವರ್ಡ್‌ಗಳು ಹೊಂದಿಕೆಯಾಗುವುದಿಲ್ಲ.', sixDigitVerification: '6 ಅಂಕಿಯ ಪರಿಶೀಲನಾ ಕೋಡ್ ನಮೂದಿಸಿ.',
    sixDigitReset: '6 ಅಂಕಿಯ ಮರುಹೊಂದಿಸುವ ಕೋಡ್ ನಮೂದಿಸಿ.', namePlaceholder: 'ನಿಮ್ಮ ಹೆಸರು',
    accountCreatedMessage: 'ಖಾತೆ ರಚಿಸಲಾಗಿದೆ. ನಿಮ್ಮ ಇಮೇಲ್ ಮತ್ತು ಪಾಸ್‌ವರ್ಡ್‌ನಿಂದ ಲಾಗಿನ್ ಮಾಡಿ.',
    passwordChangedMessage: 'ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಲಾಗಿದೆ. ಹೊಸ ಪಾಸ್‌ವರ್ಡ್‌ನಿಂದ ಲಾಗಿನ್ ಮಾಡಿ.',
    verificationSent: '{email} ಗೆ ಪರಿಶೀಲನಾ ಕೋಡ್ ಕಳುಹಿಸಿದ್ದೇವೆ. ಕೆಳಗೆ ನಮೂದಿಸಿ.',
    resetCodeSent: 'ಪರಿಶೀಲಿಸಿದ ಖಾತೆ ಇದ್ದರೆ ಮರುಹೊಂದಿಸುವ ಕೋಡ್ ಕಳುಹಿಸಲಾಗಿದೆ.',
    greetingFriend: 'ನಮಸ್ಕಾರ ಸ್ನೇಹಿತರೆ! 💚🍃', assistantTagline: 'ನಿಮ್ಮ ಆತ್ಮೀಯ ಸಹಾಯಕ. ಇಂದು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?',
    welcomeTagline: 'ಪ್ರತಿ ವೆಚ್ಚಕ್ಕೂ ಲೆಕ್ಕ.\nಪ್ರತಿ ಆದಾಯಕ್ಕೂ ಮೌಲ್ಯ.',
    moreOptions: 'ಹೆಚ್ಚಿನ ಆಯ್ಕೆಗಳು', settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು', goBack: 'ಹಿಂದಕ್ಕೆ ಹೋಗಿ',
    openAssistant: 'LittleLeaf ಚಾಟ್‌ಬಾಟ್ ತೆರೆಯಿರಿ', anyHelp: 'ಸಹಾಯ ಬೇಕೇ? 🌱',
    searchCrops: 'ಲಭ್ಯ ಬೆಳೆಗಳನ್ನು ಹುಡುಕಿ', searchCropsAccessibility: 'ಮಾರಾಟಕ್ಕೆ ಲಭ್ಯವಿರುವ ಬೆಳೆಗಳನ್ನು ಹುಡುಕಿ',
    clearCropSearch: 'ಬೆಳೆ ಹುಡುಕಾಟ ತೆರವುಗೊಳಿಸಿ', noSearchResults: '“{query}”ಗೆ ಹೊಂದುವ ಬೆಳೆಗಳಿಲ್ಲ.',
    selectCropForRecommendation: 'ಶಿಫಾರಸು ಮಾಡಿದ ಮಾರುಕಟ್ಟೆಗೆ ಬೆಳೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.',
    selectCropForMarketActions: 'ಮಾರುಕಟ್ಟೆ ಹೋಲಿಸಲು ಅಥವಾ ಲಾಭ ಲೆಕ್ಕಿಸಲು ಮೇಲಿನ ಬೆಳೆಯನ್ನು ಹುಡುಕಿ ಆಯ್ಕೆಮಾಡಿ.',
    selectCropAlertTitle: 'ಬೆಳೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ', selectCropBeforeCompare: 'ಮಾರುಕಟ್ಟೆ ಹೋಲಿಸುವ ಮೊದಲು ಮೇಲಿನ ಬೆಳೆಯನ್ನು ಹುಡುಕಿ ಆಯ್ಕೆಮಾಡಿ.',
    selectCropBeforeProfit: 'ಲಾಭ ಲೆಕ್ಕಿಸುವ ಮೊದಲು ಮೇಲಿನ ಬೆಳೆಯನ್ನು ಹುಡುಕಿ ಆಯ್ಕೆಮಾಡಿ.',
    seasonalPlanning: 'ಋತುಮಾನ ಯೋಜನೆ', cropPlannerTitle: '6 ತಿಂಗಳ ಸ್ಮಾರ್ಟ್ ಬೆಳೆ ಯೋಜಕ',
    cropPlannerDescription: 'ನಿಮ್ಮ ಮಣ್ಣು, ನೀರಾವರಿ ಮತ್ತು ಬಿತ್ತನೆ ತಿಂಗಳಿಗೆ ಸೂಕ್ತ ಬೆಳೆಗಳನ್ನು ತಿಳಿಯಿರಿ.',
    findBestMandiProfit: 'ನಿವ್ವಳ ಲಾಭದ ಆಧಾರದ ಮೇಲೆ ಉತ್ತಮ ಮಂಡಿ ಹುಡುಕಿ',
    bestForQuantity: '{quantity} ಕೆಜಿಗೆ ಉತ್ತಮ ಆಯ್ಕೆ: {mandi} — ಸಾರಿಗೆ ನಂತರ ಅಂದಾಜು ನಿವ್ವಳ ₹{profit}; ರಸ್ತೆ ದೂರ ಸುಮಾರು {distance} ಕಿಮೀ.',
    noPriceAvailable: 'ಬೆಲೆ ಲಭ್ಯವಿಲ್ಲ', savedDaysAgo: '{days} ದಿನಗಳ ಹಿಂದೆ ಉಳಿಸಲಾಗಿದೆ',
    savedPriceAge: 'ಉಳಿಸಿದ ಬೆಲೆ {days} ದಿನ ಹಳೆಯದು', aboutDistanceAway: 'ಸುಮಾರು {distance} ಕಿಮೀ ದೂರ',
    saved: 'ಉಳಿಸಲಾಗಿದೆ',
    marketComparisonDisclaimer: 'ಆಯ್ದ ಮಂಡಿಗೆ ವರದಿಯಾದ ಲೈವ್ ಅಥವಾ ಉಳಿಸಿದ ಬೆಲೆಗಳನ್ನು ಮಾತ್ರ ಹೋಲಿಕೆ ಮತ್ತು ಲಾಭಕ್ಕೆ ಬಳಸಲಾಗುತ್ತದೆ.',
    exampleQuantity: 'ಉದಾ. 100', latestSavedPrice: 'ಇತ್ತೀಚಿನ ಉಳಿಸಿದ Agmarknet ವರದಿ: {date} ({days} ದಿನ ಹಳೆಯದು)',
    drivingRouteAccessibility: 'ಆಯ್ದ ಮಂಡಿಗೆ ರಸ್ತೆ ಮಾರ್ಗ', yourLocationMarker: 'ನಿಮ್ಮ ಸ್ಥಳ',
    selectedMandiMarker: 'ಆಯ್ದ ಮಂಡಿ', osmAttribution: 'ಮಾರ್ಗ © OpenStreetMap ಕೊಡುಗೆದಾರರು',
    modalPricePerKg: 'ಮಾದರಿ ಬೆಲೆ', estimatedNetForQuantity: '{quantity} ಕೆಜಿಗೆ ಸಾರಿಗೆ ನಂತರ ಅಂದಾಜು ನಿವ್ವಳ ಲಾಭ: ₹{profit}',
    approxRoadTransport: 'ರಸ್ತೆಯಲ್ಲಿ ಸುಮಾರು {distance} ಕಿಮೀ · ಅಂದಾಜು ಸಾರಿಗೆ ₹{cost}',
    savedAgmarknetAge: 'ಇತ್ತೀಚಿನ ಉಳಿಸಿದ Agmarknet ಬೆಲೆ ಬಳಸಲಾಗಿದೆ; ವರದಿ {days} ದಿನಗಳ ಹಿಂದಿನದು.',
    agmarknetReport: 'Agmarknet ವರದಿ: {date}',
    plannerEyebrow: 'ವಿಶ್ವಾಸದಿಂದ ಯೋಜಿಸಿ', plannerSubtitle: 'ಋತುಮಾನ, ಸ್ಥಳೀಯ ಹವಾಮಾನ ಮತ್ತು ಹತ್ತಿರದ ಮಂಡಿ ದಾಖಲೆಗಳು ಒಂದೇ ಕಡೆ.',
    choosePlanningPeriod: 'ಯೋಜನೆ ಅವಧಿ ಆಯ್ಕೆಮಾಡಿ', planStartsFirstMonth: 'ಯೋಜನೆ ಮೊದಲ ತಿಂಗಳಲ್ಲಿ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ',
    farmDetails: 'ನಿಮ್ಮ ಜಮೀನಿನ ವಿವರಗಳು', locationPlaceholder: 'ಪಟ್ಟಣ, ಗ್ರಾಮ ಅಥವಾ ಜಿಲ್ಲೆ',
    planningFor: '{place}ಗಾಗಿ ಯೋಜನೆ', farmSize: 'ಜಮೀನಿನ ವಿಸ್ತೀರ್ಣ', acres: 'ಎಕರೆ',
    farmSizeAccessibility: 'ಎಕರೆಗಳಲ್ಲಿ ಜಮೀನಿನ ವಿಸ್ತೀರ್ಣ', soilType: 'ಮಣ್ಣಿನ ವಿಧ', notSure: 'ತಿಳಿದಿಲ್ಲ',
    soilRed: 'ಕೆಂಪು', soilBlack: 'ಕಪ್ಪು', soilClay: 'ಜೇಡಿ', soilSandy: 'ಮರಳು', soilLoamy: 'ಲೋಮಿ', soilAlluvial: 'ಮೆಕ್ಕಲು',
    irrigation: 'ನೀರಾವರಿ', irrigationRainfed: 'ಮಳೆ ಆಧಾರಿತ', irrigationBorewell: 'ಬೋರ್‌ವೆಲ್',
    irrigationCanal: 'ಕಾಲುವೆ', irrigationDrip: 'ಹನಿ ನೀರಾವರಿ', cropPreferences: 'ಬೆಳೆ ಆದ್ಯತೆಗಳು',
    optional: '(ಐಚ್ಛಿಕ)', climate: '{region} · {date}ರ ಹವಾಮಾನ',
    climateDetail: 'ಸರಾಸರಿ ಮಳೆ {rain} ಮಿಮೀ · ಸರಾಸರಿ ತಾಪಮಾನ {temperature}°C · {years} ವರ್ಷಗಳ ದಾಖಲೆ',
    topCrops: '{period} ಅವಧಿಗೆ ಉತ್ತಮ 3 ಬೆಳೆಗಳು', rankedBy: 'ಬೆಳೆ ಆದ್ಯತೆ, ಋತು ಮತ್ತು ಜಮೀನಿನ ವಿವರಗಳ ಆಧಾರದ ಶ್ರೇಣಿ',
    bestFit: '{score}% ಸೂಕ್ತತೆ', allowLocationOrSearch: 'ಯೋಜನೆ ರೂಪಿಸಲು ಸ್ಥಳ ಪ್ರವೇಶ ನೀಡಿ ಅಥವಾ ನಿಮ್ಮ ಊರನ್ನು ಹುಡುಕಿ.',
    checkingClimate: 'ಋತುಮಾನದ ಹವಾಮಾನ ಮತ್ತು ಹತ್ತಿರದ ಮಂಡಿ ಮಾಹಿತಿ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…',
    noCropProfiles: 'ಈ ಸ್ಥಳಕ್ಕೆ ಬೆಳೆ ವಿವರಗಳು ಇನ್ನೂ ಲಭ್ಯವಿಲ್ಲ.',
    bestMatch: 'ಅತ್ಯುತ್ತಮ ಹೊಂದಾಣಿಕೆ', fitScore: ' / 100 ಸೂಕ್ತತೆ', growTime: 'ಬೆಳೆಯುವ ಅವಧಿ', water: 'ನೀರು',
    yieldPerAcre: 'ಎಕರೆಗೆ ಇಳುವರಿ', sowingToHarvest: 'ಬಿತ್ತನೆಯಿಂದ ಕೊಯ್ಲಿನವರೆಗೆ', sow: 'ಬಿತ್ತನೆ',
    harvest: 'ಕೊಯ್ಲು ~{date}', hideCropDetails: 'ಬೆಳೆ ವಿವರ ಮರೆಮಾಡಿ', viewCropDetails: 'ಬೆಳೆ ವಿವರ ನೋಡಿ',
    suitableSoil: 'ಸೂಕ್ತ ಮಣ್ಣು', checkLocalAgricultureExpert: 'ಸ್ಥಳೀಯ ಕೃಷಿ ತಜ್ಞರನ್ನು ಸಂಪರ್ಕಿಸಿ.',
    suitableIrrigation: 'ಸೂಕ್ತ ನೀರಾವರಿ', chooseWaterAvailability: 'ಸ್ಥಳೀಯ ನೀರಿನ ಲಭ್ಯತೆ ಆಧರಿಸಿ ಆಯ್ಕೆಮಾಡಿ.',
    whyCropMatches: 'ಈ ಬೆಳೆ ಏಕೆ ಸೂಕ್ತವಾಗಿದೆ', nearbyMandiTrend: 'ಹತ್ತಿರದ ಮಂಡಿ ಬೆಲೆ ಪ್ರವೃತ್ತಿ',
    noNearbyPriceHistory: 'ಹತ್ತಿರದ ಪರಿಶೀಲಿತ ₹/ಕೆಜಿ ಮಾರುಕಟ್ಟೆ ದಾಖಲೆ ಇನ್ನೂ ಇಲ್ಲ.',
    planningEstimate: 'ಯೋಜನಾ ಅಂದಾಜು · {size} ಎಕರೆ', cultivationCost: 'ಕೃಷಿ ವೆಚ್ಚ',
    potentialProfit: 'ಸಂಭಾವ್ಯ ಲಾಭ',
    plannerFinanceDisclaimer: 'ಹತ್ತಿರದ ದಾಖಲಾಗಿರುವ ಮಂಡಿ ಬೆಲೆ ಮತ್ತು ಯೋಜಕದ ಅಂದಾಜು ಇಳುವರಿ/ವೆಚ್ಚವನ್ನು ಬಳಸುತ್ತದೆ. ನಿಜವಾದ ಫಲಿತಾಂಶ ಬದಲಾಗಬಹುದು.',
    plannerProfitDataMissing: 'ಲಾಭ ಲೆಕ್ಕಿಸಲು ಪರಿಶೀಲಿತ ₹/ಕೆಜಿ ಘಟಕದ ಹತ್ತಿರದ ಮಂಡಿ ದಾಖಲೆ ಅಗತ್ಯ. ಪ್ರಸ್ತುತ ಮಾರುಕಟ್ಟೆ ಡೇಟಾ ಆಮದುಮಾಡಿ.',
    dayRange: '{start}–{end} ದಿನಗಳು', waterLow: 'ಕಡಿಮೆ', waterMedium: 'ಮಧ್ಯಮ', waterHigh: 'ಹೆಚ್ಚು',
    waterLowMedium: 'ಕಡಿಮೆಯಿಂದ ಮಧ್ಯಮ',
    reasonSowingWindow: 'ಆಯ್ದ ತಿಂಗಳು ಈ ಬೆಳೆಯ ಸಾಮಾನ್ಯ ಬಿತ್ತನೆ ಅವಧಿಗೆ ಹೊಂದುತ್ತದೆ.',
    reasonOutsideSowingWindow: 'ಈ ತಿಂಗಳು ಈ ಬೆಳೆಯ ಮುಖ್ಯ ಬಿತ್ತನೆ ಅವಧಿಯ ಹೊರಗಿದೆ.',
    reasonRainfallFits: 'ಈ ತಿಂಗಳ ಐತಿಹಾಸಿಕ ಸರಾಸರಿ ಮಳೆ {rainfall} ಮಿಮೀ; ಇದು ಬೆಳೆಯ ಯೋಜನಾ ವ್ಯಾಪ್ತಿಯಲ್ಲಿದೆ.',
    reasonIrrigationOffsetsRain: 'ಕಡಿಮೆ ಐತಿಹಾಸಿಕ ಮಳೆಯನ್ನು ನೀರಾವರಿ ಸಹಾಯದಿಂದ ಸರಿದೂಗಿಸಬಹುದು.',
    reasonCheckWater: 'ಐತಿಹಾಸಿಕ ಸರಾಸರಿ ಮಳೆ {rainfall} ಮಿಮೀ; ನೀರಿನ ಲಭ್ಯತೆ ಮತ್ತು ಒಳಚರಂಡಿ ಪರಿಶೀಲಿಸಿ.',
    reasonTemperatureFits: 'ಐತಿಹಾಸಿಕ ಮಾಸಿಕ ಸರಾಸರಿ ತಾಪಮಾನ ({temperature}°C) ಬೆಳೆಯ ಯೋಜನಾ ವ್ಯಾಪ್ತಿಯಲ್ಲಿದೆ.',
    reasonTemperatureOutside: 'ಐತಿಹಾಸಿಕ ಮಾಸಿಕ ತಾಪಮಾನ ಬೆಳೆಯ ಸೂಕ್ತ ಯೋಜನಾ ವ್ಯಾಪ್ತಿಯ ಹೊರಗಿದೆ.',
    reasonSoilNotSelected: 'ಮಣ್ಣಿನ ವಿಧ ಆಯ್ಕೆಮಾಡುವವರೆಗೆ ಮಣ್ಣಿನ ಹೊಂದಾಣಿಕೆಯನ್ನು ಸೇರಿಸಲಾಗುವುದಿಲ್ಲ.',
    reasonSoilSuitable: 'ಆಯ್ದ ಮಣ್ಣಿನ ವಿಧ ಈ ಬೆಳೆಗೆ ಸೂಕ್ತವಾಗಿದೆ.',
    reasonSoilLessSuitable: 'ಆಯ್ದ ಮಣ್ಣು ಕಡಿಮೆ ಸೂಕ್ತವಾಗಿದೆ; ಸ್ಥಳೀಯ ಮಣ್ಣು ಪರೀಕ್ಷೆ ಮತ್ತು ತಜ್ಞರ ಸಲಹೆ ಪಡೆಯಿರಿ.',
    reasonReliableWater: 'ಈ ಬೆಳೆಗೆ ವಿಶ್ವಾಸಾರ್ಹ ನೀರಿನ ಅಗತ್ಯವಿದೆ; ಮಳೆ ಆಧಾರಿತ ಕೃಷಿ ಅಪಾಯಕಾರಿಯಾಗಬಹುದು.',
    reasonIrrigationSupports: 'ನಿಮ್ಮ ನೀರಾವರಿ ಆಯ್ಕೆ ಈ ಬೆಳೆಯ ನೀರಿನ ಅಗತ್ಯಕ್ಕೆ ಸಹಾಯಕವಾಗಿದೆ.',
    reasonPreferenceMatch: 'ಈ ಬೆಳೆ ನಿಮ್ಮ ಆಯ್ದ ಆದ್ಯತೆಗಳಿಗೆ ಹೊಂದುತ್ತದೆ.',
    generalCropSuitability: 'ಸೂಕ್ತತೆಯು ಋತು, ಹವಾಮಾನ, ಮಣ್ಣು, ನೀರಾವರಿ ಮತ್ತು ನಿಮ್ಮ ಆದ್ಯತೆಗಳನ್ನು ಪರಿಗಣಿಸುತ್ತದೆ.',
    enterTown: 'ಪಟ್ಟಣ, ಗ್ರಾಮ ಅಥವಾ ಜಿಲ್ಲೆಯನ್ನು ನಮೂದಿಸಿ.',
    placeNotFound: 'ಆ ಸ್ಥಳ ಕಂಡುಬಂದಿಲ್ಲ. ಹತ್ತಿರದ ಪಟ್ಟಣ ಅಥವಾ ಜಿಲ್ಲೆಯನ್ನು ಪ್ರಯತ್ನಿಸಿ.',
    localWaterAvailability: 'ಸ್ಥಳೀಯ ನೀರಿನ ಲಭ್ಯತೆ ಆಧರಿಸಿ ಆಯ್ಕೆಮಾಡಿ.',
    noNearbyMandiHistory: 'ಹತ್ತಿರದ ಪರಿಶೀಲಿತ ₹/ಕೆಜಿ ಮಾರುಕಟ್ಟೆ ದಾಖಲೆ ಇನ್ನೂ ಇಲ್ಲ.',
    currentReportedPrices: 'Agmarknet ವರದಿ ಮಾಡಿದ ಇತ್ತೀಚಿನ {crop} ಮಾದರಿ ಬೆಲೆಗಳು',
    reportedNotLive: 'ಇವು ವರದಿಯಾದ ಬೆಲೆಗಳು; ಲೈವ್ ದರದ ಖಾತರಿಯಲ್ಲ.',
    savedPricesFallback: 'ಹೊಸ ಲೈವ್ ವರದಿ ಲಭ್ಯವಿಲ್ಲದಾಗ ಉಳಿಸಿದ ಬೆಲೆಗಳನ್ನು ತೋರಿಸಲಾಗುತ್ತದೆ. ಉಳಿಸಿದ ಅಥವಾ ಲೈವ್ ವರದಿ ಇಲ್ಲದ ಮಂಡಿಗಳನ್ನು ಹೋಲಿಸಲಾಗುವುದಿಲ್ಲ: {crop}.',
    noReportForCrop: 'ಪಟ್ಟಿಯಲ್ಲಿರುವ ಮಂಡಿಗಳಲ್ಲಿ {crop}ಗೆ ಇತ್ತೀಚಿನ ಡೇಟಾ ಅಥವಾ ಉಳಿಸಿದ ಸ್ನ್ಯಾಪ್‌ಶಾಟ್‌ನಲ್ಲಿ Agmarknet ವರದಿ ಕಂಡುಬಂದಿಲ್ಲ.',
    noCurrentCropPrice: '{crop}ಗೆ ಪ್ರಸ್ತುತ Agmarknet ಬೆಲೆ ಲಭ್ಯವಿಲ್ಲ',
    savedReportThrough: '{date}ರವರೆಗಿನ ಉಳಿಸಿದ Agmarknet ವರದಿ',
    noStateFound: 'ನಿಮ್ಮ ರಾಜ್ಯ ಗುರುತಿಸಲಾಗಲಿಲ್ಲ. ಸ್ಥಳ ಪ್ರವೇಶ ನೀಡಿ ಮಾರುಕಟ್ಟೆ ಹೋಲಿಕೆಯನ್ನು ಮತ್ತೆ ತೆರೆಯಿರಿ.',
    noStateForProfit: 'ನಿಮ್ಮ ರಾಜ್ಯ ಗುರುತಿಸಲಾಗಲಿಲ್ಲ. ಸ್ಥಳ ಪ್ರವೇಶ ನೀಡಿ ಲಾಭ ಲೆಕ್ಕಾಚಾರವನ್ನು ಮತ್ತೆ ತೆರೆಯಿರಿ.',
    validQuantityBeforeCompare: 'ಮಂಡಿ ಲಾಭ ಹೋಲಿಸುವ ಮೊದಲು ಸರಿಯಾದ ಪ್ರಮಾಣ ನಮೂದಿಸಿ.',
    locationNeededForProfit: 'ಸಾರಿಗೆ ನಂತರದ ನಿವ್ವಳ ಲಾಭ ಹೋಲಿಸಲು ಸ್ಥಳ ಪ್ರವೇಶ ನೀಡಿ.',
    noComparisonPrices: 'ಲಾಭ ಹೋಲಿಸಲು ಇತ್ತೀಚಿನ ಡೇಟಾ ಅಥವಾ ಉಳಿಸಿದ ಸ್ನ್ಯಾಪ್‌ಶಾಟ್‌ನಲ್ಲಿ Agmarknet ಬೆಲೆ ಲಭ್ಯವಿಲ್ಲ.',
    selectMandiQuantity: 'ಮಂಡಿ ಆಯ್ಕೆಮಾಡಿ ಮತ್ತು ಸರಿಯಾದ ಪ್ರಮಾಣ ನಮೂದಿಸಿ.',
    locationNeededForRoute: 'ಮಾರ್ಗ ಮತ್ತು ಸಾರಿಗೆ ವೆಚ್ಚ ಅಂದಾಜಿಸಲು ಸ್ಥಳ ಪ್ರವೇಶ ನೀಡಿ.',
    marketPriceFallback: 'ಈ ಬೆಳೆಗೆ ಇತ್ತೀಚಿನ ಡೇಟಾ ಅಥವಾ ಉಳಿಸಿದ ಸ್ನ್ಯಾಪ್‌ಶಾಟ್‌ನಲ್ಲಿ Agmarknet ಬೆಲೆ ವರದಿ ಕಂಡುಬಂದಿಲ್ಲ.',
    clear: 'ತೆರವುಗೊಳಿಸಿ',
    marketNameFallback: 'ಮಾರುಕಟ್ಟೆ', inState: '{state} ರಾಜ್ಯದಲ್ಲಿ.', modelVersion: 'ಮಾದರಿ: {version}',
    invalidName: 'ಹೆಸರು ಅಕ್ಷರದಿಂದ ಪ್ರಾರಂಭವಾಗಬೇಕು ಮತ್ತು ಅಕ್ಷರಗಳನ್ನು ಮಾತ್ರ ಹೊಂದಿರಬೇಕು.',
    invalidEmail: 'ಸರಿಯಾದ ಇಮೇಲ್ ವಿಳಾಸ ನಮೂದಿಸಿ.',
    passwordTooShort: 'ಪಾಸ್‌ವರ್ಡ್ ಕನಿಷ್ಠ 8 ಅಕ್ಷರಗಳಿರಬೇಕು.',
    passwordNeedsNumber: 'ಪಾಸ್‌ವರ್ಡ್‌ನಲ್ಲಿ ಕನಿಷ್ಠ ಒಂದು ಸಂಖ್ಯೆ ಇರಬೇಕು.',
    passwordNeedsSpecialCharacter: 'ಪಾಸ್‌ವರ್ಡ್‌ನಲ್ಲಿ ಕನಿಷ್ಠ ಒಂದು ವಿಶೇಷ ಚಿಹ್ನೆ ಇರಬೇಕು.',
  },
};

const translationPatterns = Object.fromEntries(Object.entries(translations).map(([code, dictionary]) => [
  code,
  Object.entries(dictionary).map(([key, template]) => {
    const placeholders = [];
    const expression = new RegExp(`^${template.split(/(\{\w+\})/g).map((part) => {
      if (/^\{\w+\}$/.test(part)) {
        placeholders.push(part.slice(1, -1));
        return '([\\s\\S]*?)';
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('')}$`);
    return { key, placeholders, expression };
  }),
]));

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');
  const languageChangedByUser = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_KEY)
      .then((savedLanguage) => {
        if (languageChangedByUser.current) return;
        if (translations[savedLanguage]) setLanguageState(savedLanguage);
        else if (savedLanguage) return AsyncStorage.setItem(LANGUAGE_KEY, 'en');
        return undefined;
      })
      .catch((error) => console.warn('Could not load saved language preference:', error.message));
  }, []);

  async function setLanguage(nextLanguage) {
    if (!translations[nextLanguage]) return;
    languageChangedByUser.current = true;
    setLanguageState(nextLanguage);
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, nextLanguage);
    } catch (error) {
      console.warn('Could not save language preference:', error.message);
    }
  }

  function t(key, values = {}) {
    const template = translations[language][key] || translations.en[key] || key;
    return template.replace(/\{(\w+)\}/g, (match, name) => (
      Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match
    ));
  }

  function localize(message) {
    if (typeof message !== 'string') return message;
    const dictionaries = language === 'kn'
      ? ['en', 'kn']
      : ['kn', 'en'];
    const target = translations[language];
    for (const sourceLanguage of dictionaries) {
      for (const pattern of translationPatterns[sourceLanguage]) {
        const match = message.match(pattern.expression);
        if (!match) continue;
        const values = Object.fromEntries(pattern.placeholders.map((name, index) => [name, match[index + 1]]));
        return target[pattern.key].replace(/\{(\w+)\}/g, (placeholder, name) => (
          Object.prototype.hasOwnProperty.call(values, name) ? values[name] : placeholder
        ));
      }
    }
    return message;
  }

  return (
    <LanguageContext.Provider value={{ language, languages, setLanguage, t, localize }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
