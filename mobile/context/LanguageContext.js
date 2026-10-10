import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = 'smartRaithaLanguage';

export const languages = [
  { code: 'en', label: 'English' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'te', label: 'తెలుగు' },
];

const translations = {
  en: {
    language: 'Language',
    home: 'Home',
    profile: 'Profile',
    markets: 'Markets',
    profitCalculator: 'Profit Calculator',
    assistant: 'LittleLeaf', assistantHelp: 'Ask LittleLeaf for help', voiceOn: 'Voice on', voiceOff: 'Voice off', speak: 'Speak reply',
    whatSelling: 'What are you selling?',
    recommendedMarket: 'Recommended market',
    compareMarkets: 'Compare Markets',
    calculateProfit: 'Calculate Profit',
    selectMandi: 'Select mandi',
    quantityKg: 'Quantity (kg)',
    loadingMarkets: 'Loading markets...',
    fetchingPrices: 'Fetching mandi prices...',
    noPriceData: 'No price data available for this crop.',
    notEnoughData: 'Not enough data to make a recommendation yet.',
    modalPrice: 'Modal price',
    grossRevenue: 'Gross revenue',
    transportationCost: 'Transportation cost',
    otherCosts: 'Other costs',
    estimatedNetProfit: 'Estimated net profit',
    name: 'Name',
    email: 'Email',
    logOut: 'Log Out',
    askAssistant: 'Ask SmartRaitha anything',
    assistantPlaceholder: 'Ask about prices, crops, or profit...',
    send: 'Send',
    assistantIntro: 'I can help with crops, mandi prices, and profit calculations.',
    assistantUnavailable: 'AI service is not configured yet. Try asking about crops, markets, or profit.',
    goodMorning: 'Good morning',
    goodAfternoon: 'Good afternoon',
    goodEvening: 'Good evening',
    goodNight: 'Good night',
    loginSubtitle: 'Log in to continue', password: 'Password', confirmPassword: 'Confirm Password', logIn: 'Log In', signUp: 'Sign Up',
    createAccount: 'Create account', joinSmartRaitha: 'Join SmartRaitha to compare mandi prices', noAccount: "Don't have an account? Sign up", hasAccount: 'Already have an account? Log in',
    gender: 'Gender', age: 'Age', place: 'Place', saveProfile: 'Save profile', profileSaved: 'Profile saved.', genderPlaceholder: 'e.g. Female', agePlaceholder: 'e.g. 35', placePlaceholder: 'Village, district or city',
    priceGraph: 'Price graph', bestMandiGraph: 'Best mandi price comparison', bestMandi: 'Best', priceAxis: 'Price (₹)', mandiAxis: 'Mandi', actionHint: 'Make your next selling decision with confidence.',
    help: 'Farm help', helpHint: 'Weather, seasons, and crop planning', weather: 'Weather for your farm', location: 'Location', futureForecast: 'Next 7 days', recommendedCrop: 'Weather-based crop suggestion', cultivateNow: 'Good crop to cultivate now', cropTiming: 'Best growing window', weatherUnavailable: 'Weather data is unavailable right now.', rain: 'Rain', humidity: 'Humidity', wind: 'Wind', seasonalGuide: 'Seasonal guide', helpText: 'Use the weather and seasonal guide to plan sowing. Confirm with local agriculture officers before planting.', futurePrice: 'Future crop price', twoDayPrediction: 'Estimated price after 2 days', predictTwoDays: 'Predict 2-day prices', predicting: 'Predicting...', predictedOn: 'For', predictionUnavailable: 'Prediction service is unavailable. Start the ML service and try again.',
    marketHint: 'Compare the best prices across mandis', profitHint: 'Estimate earnings before you sell', recommendedHint: 'Your best option based on profit',
  },
  kn: {
    language: 'ಭಾಷೆ', home: 'ಮುಖಪುಟ', profile: 'ಪ್ರೊಫೈಲ್', markets: 'ಮಾರುಕಟ್ಟೆಗಳು',
    profitCalculator: 'ಲಾಭ ಲೆಕ್ಕಾಚಾರ', assistant: 'LittleLeaf', assistantHelp: 'LittleLeaf ನಿಂದ ಸಹಾಯ ಕೇಳಿ', voiceOn: 'ಧ್ವನಿ ಆನ್', voiceOff: 'ಧ್ವನಿ ಆಫ್', speak: 'ಉತ್ತರವನ್ನು ಕೇಳಿ', whatSelling: 'ನೀವು ಏನು ಮಾರಾಟ ಮಾಡುತ್ತಿದ್ದೀರಿ?',
    recommendedMarket: 'ಶಿಫಾರಸು ಮಾಡಿದ ಮಾರುಕಟ್ಟೆ', compareMarkets: 'ಮಾರುಕಟ್ಟೆಗಳನ್ನು ಹೋಲಿಸಿ', calculateProfit: 'ಲಾಭ ಲೆಕ್ಕಿಸಿ',
    selectMandi: 'ಮಂಡಿ ಆಯ್ಕೆಮಾಡಿ', quantityKg: 'ಪ್ರಮಾಣ (ಕೆಜಿ)', loadingMarkets: 'ಮಾರುಕಟ್ಟೆಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...',
    fetchingPrices: 'ಮಂಡಿ ಬೆಲೆಗಳನ್ನು ಪಡೆಯಲಾಗುತ್ತಿದೆ...', noPriceData: 'ಈ ಬೆಳೆಗೆ ಬೆಲೆ ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ.',
    notEnoughData: 'ಶಿಫಾರಸು ಮಾಡಲು ಇನ್ನೂ ಸಾಕಷ್ಟು ಮಾಹಿತಿ ಇಲ್ಲ.', modalPrice: 'ಮಾದರಿ ಬೆಲೆ', grossRevenue: 'ಒಟ್ಟು ಆದಾಯ',
    transportationCost: 'ಸಾರಿಗೆ ವೆಚ್ಚ', otherCosts: 'ಇತರೆ ವೆಚ್ಚಗಳು', estimatedNetProfit: 'ಅಂದಾಜು ನಿವ್ವಳ ಲಾಭ',
    name: 'ಹೆಸರು', email: 'ಇಮೇಲ್', logOut: 'ಲಾಗ್ ಔಟ್', askAssistant: 'SmartRaitha ಗೆ ಏನಾದರೂ ಕೇಳಿ',
    assistantPlaceholder: 'ಬೆಳೆ, ಮಾರುಕಟ್ಟೆ ಅಥವಾ ಲಾಭದ ಬಗ್ಗೆ ಕೇಳಿ...', send: 'ಕಳುಹಿಸಿ',
    assistantIntro: 'ಬೆಳೆಗಳು, ಮಂಡಿ ಬೆಲೆಗಳು ಮತ್ತು ಲಾಭ ಲೆಕ್ಕಾಚಾರದಲ್ಲಿ ನಾನು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ.',
    assistantUnavailable: 'AI ಸೇವೆ ಇನ್ನೂ ಹೊಂದಿಸಲಾಗಿಲ್ಲ. ಬೆಳೆ, ಮಾರುಕಟ್ಟೆ ಅಥವಾ ಲಾಭದ ಬಗ್ಗೆ ಕೇಳಿ.',
    goodMorning: 'ಶುಭೋದಯ', goodAfternoon: 'ಶುಭ ಮಧ್ಯಾಹ್ನ', goodEvening: 'ಶುಭ ಸಂಜೆ', goodNight: 'ಶುಭ ರಾತ್ರಿ',
    loginSubtitle: 'ಮುಂದುವರಿಯಲು ಲಾಗಿನ್ ಮಾಡಿ', password: 'ಪಾಸ್‌ವರ್ಡ್', confirmPassword: 'ಪಾಸ್‌ವರ್ಡ್ ದೃಢೀಕರಿಸಿ', logIn: 'ಲಾಗಿನ್', signUp: 'ಸೈನ್ ಅಪ್',
    createAccount: 'ಖಾತೆ ರಚಿಸಿ', joinSmartRaitha: 'ಮಂಡಿ ಬೆಲೆಗಳನ್ನು ಹೋಲಿಸಲು SmartRaitha ಗೆ ಸೇರಿ', noAccount: 'ಖಾತೆ ಇಲ್ಲವೇ? ಸೈನ್ ಅಪ್ ಮಾಡಿ', hasAccount: 'ಈಗಾಗಲೇ ಖಾತೆ ಇದೆಯೇ? ಲಾಗಿನ್ ಮಾಡಿ',
    gender: 'ಲಿಂಗ', age: 'ವಯಸ್ಸು', place: 'ಸ್ಥಳ', saveProfile: 'ಪ್ರೊಫೈಲ್ ಉಳಿಸಿ', profileSaved: 'ಪ್ರೊಫೈಲ್ ಉಳಿಸಲಾಗಿದೆ.', genderPlaceholder: 'ಉದಾ. ಮಹಿಳೆ', agePlaceholder: 'ಉದಾ. 35', placePlaceholder: 'ಗ್ರಾಮ, ಜಿಲ್ಲೆ ಅಥವಾ ನಗರ',
    priceGraph: 'ಬೆಲೆ ಗ್ರಾಫ್', bestMandiGraph: 'ಅತ್ಯುತ್ತಮ ಮಂಡಿ ಬೆಲೆ ಹೋಲಿಕೆ', bestMandi: 'ಅತ್ಯುತ್ತಮ', priceAxis: 'ಬೆಲೆ (₹)', mandiAxis: 'ಮಂಡಿ', actionHint: 'ವಿಶ್ವಾಸದಿಂದ ನಿಮ್ಮ ಮುಂದಿನ ಮಾರಾಟದ ನಿರ್ಧಾರ ತೆಗೆದುಕೊಳ್ಳಿ.', futureForecast: 'ಮುಂದಿನ 7 ದಿನಗಳು', location: 'ಸ್ಥಳ', helpHint: 'ಹವಾಮಾನ, ಋತುಗಳು ಮತ್ತು ಬೆಳೆ ಯೋಜನೆ', marketHint: 'ಮಂಡಿಗಳಲ್ಲಿನ ಉತ್ತಮ ಬೆಲೆಗಳನ್ನು ಹೋಲಿಸಿ', profitHint: 'ಮಾರಾಟಕ್ಕೂ ಮೊದಲು ಆದಾಯ ಅಂದಾಜಿಸಿ', recommendedHint: 'ಲಾಭದ ಆಧಾರದ ಮೇಲೆ ನಿಮ್ಮ ಉತ್ತಮ ಆಯ್ಕೆ',
  },
  hi: {
    language: 'भाषा', home: 'होम', profile: 'प्रोफ़ाइल', markets: 'बाज़ार', profitCalculator: 'लाभ कैलकुलेटर',
    assistant: 'LittleLeaf', assistantHelp: 'LittleLeaf से सहायता पूछें', voiceOn: 'आवाज़ चालू', voiceOff: 'आवाज़ बंद', speak: 'उत्तर सुनें', whatSelling: 'आप क्या बेच रहे हैं?', recommendedMarket: 'अनुशंसित बाज़ार',
    compareMarkets: 'बाज़ारों की तुलना करें', calculateProfit: 'लाभ की गणना करें', selectMandi: 'मंडी चुनें',
    quantityKg: 'मात्रा (किलो)', loadingMarkets: 'बाज़ार लोड हो रहे हैं...', fetchingPrices: 'मंडी की कीमतें प्राप्त हो रही हैं...',
    noPriceData: 'इस फसल के लिए कीमत की जानकारी उपलब्ध नहीं है.', notEnoughData: 'सिफारिश के लिए अभी पर्याप्त डेटा नहीं है.',
    modalPrice: 'मॉडल कीमत', grossRevenue: 'सकल आय', transportationCost: 'परिवहन लागत', otherCosts: 'अन्य लागत',
    estimatedNetProfit: 'अनुमानित शुद्ध लाभ', name: 'नाम', email: 'ईमेल', logOut: 'लॉग आउट',
    askAssistant: 'SmartRaitha से कुछ पूछें', assistantPlaceholder: 'फसल, कीमत या लाभ के बारे में पूछें...', send: 'भेजें',
    assistantIntro: 'मैं फसल, मंडी कीमत और लाभ की गणना में मदद कर सकता हूँ.',
    assistantUnavailable: 'AI सेवा अभी कॉन्फ़िगर नहीं है. फसल, बाज़ार या लाभ के बारे में पूछें.',
    goodMorning: 'सुप्रभात', goodAfternoon: 'शुभ दोपहर', goodEvening: 'शुभ संध्या', goodNight: 'शुभ रात्रि',
    loginSubtitle: 'जारी रखने के लिए लॉग इन करें', password: 'पासवर्ड', confirmPassword: 'पासवर्ड की पुष्टि करें', logIn: 'लॉग इन', signUp: 'साइन अप',
    createAccount: 'खाता बनाएं', joinSmartRaitha: 'मंडी कीमतों की तुलना करने के लिए SmartRaitha से जुड़ें', noAccount: 'खाता नहीं है? साइन अप करें', hasAccount: 'पहले से खाता है? लॉग इन करें',
    gender: 'लिंग', age: 'उम्र', place: 'स्थान', saveProfile: 'प्रोफ़ाइल सेव करें', profileSaved: 'प्रोफ़ाइल सेव हो गई.', genderPlaceholder: 'जैसे महिला', agePlaceholder: 'जैसे 35', placePlaceholder: 'गांव, जिला या शहर',
    priceGraph: 'कीमत ग्राफ', bestMandiGraph: 'सबसे अच्छी मंडी कीमत तुलना', bestMandi: 'श्रेष्ठ', priceAxis: 'कीमत (₹)', mandiAxis: 'मंडी', actionHint: 'विश्वास के साथ अपना अगला बिक्री निर्णय लें.', futureForecast: 'अगले 7 दिन', location: 'स्थान', helpHint: 'मौसम, मौसम के अनुसार खेती और योजना', marketHint: 'मंडियों में सबसे अच्छी कीमतों की तुलना करें', profitHint: 'बेचने से पहले कमाई का अनुमान लगाएं', recommendedHint: 'लाभ के आधार पर आपका सबसे अच्छा विकल्प',
  },
  te: {
    language: 'భాష', home: 'హోమ్', profile: 'ప్రొఫైల్', markets: 'మార్కెట్లు', profitCalculator: 'లాభం లెక్కింపు',
    assistant: 'LittleLeaf', assistantHelp: 'సహాయం కోసం LittleLeaf ను అడగండి', voiceOn: 'వాయిస్ ఆన్', voiceOff: 'వాయిస్ ఆఫ్', speak: 'సమాధానం వినండి', whatSelling: 'మీరు ఏమి అమ్ముతున్నారు?', recommendedMarket: 'సిఫార్సు చేసిన మార్కెట్',
    compareMarkets: 'మార్కెట్లను పోల్చండి', calculateProfit: 'లాభాన్ని లెక్కించండి', selectMandi: 'మండిని ఎంచుకోండి',
    quantityKg: 'పరిమాణం (కిలోలు)', loadingMarkets: 'మార్కెట్లు లోడ్ అవుతున్నాయి...', fetchingPrices: 'మండి ధరలు పొందుతున్నాము...',
    noPriceData: 'ఈ పంటకు ధర సమాచారం అందుబాటులో లేదు.', notEnoughData: 'సిఫార్సు చేయడానికి తగినంత సమాచారం లేదు.',
    modalPrice: 'మోడల్ ధర', grossRevenue: 'మొత్తం ఆదాయం', transportationCost: 'రవాణా ఖర్చు', otherCosts: 'ఇతర ఖర్చులు',
    estimatedNetProfit: 'అంచనా నికర లాభం', name: 'పేరు', email: 'ఇమెయిల్', logOut: 'లాగ్ అవుట్',
    askAssistant: 'SmartRaitha ను ఏదైనా అడగండి', assistantPlaceholder: 'పంటలు, ధరలు లేదా లాభం గురించి అడగండి...', send: 'పంపండి',
    assistantIntro: 'పంటలు, మండి ధరలు మరియు లాభాల లెక్కింపులో నేను సహాయం చేస్తాను.',
    assistantUnavailable: 'AI సేవ ఇంకా కాన్ఫిగర్ చేయలేదు. పంట, మార్కెట్ లేదా లాభం గురించి అడగండి.',
    goodMorning: 'శుభోదయం', goodAfternoon: 'శుభ మధ్యాహ్నం', goodEvening: 'శుభ సాయంత్రం', goodNight: 'శుభ రాత్రి',
    loginSubtitle: 'కొనసాగించడానికి లాగిన్ చేయండి', password: 'పాస్‌వర్డ్', confirmPassword: 'పాస్‌వర్డ్‌ను నిర్ధారించండి', logIn: 'లాగిన్', signUp: 'సైన్ అప్',
    createAccount: 'ఖాతాను సృష్టించండి', joinSmartRaitha: 'మండి ధరలను పోల్చడానికి SmartRaitha లో చేరండి', noAccount: 'ఖాతా లేదా? సైన్ అప్ చేయండి', hasAccount: 'ఇప్పటికే ఖాతా ఉందా? లాగిన్ చేయండి',
    gender: 'లింగం', age: 'వయస్సు', place: 'స్థలం', saveProfile: 'ప్రొఫైల్ సేవ్ చేయండి', profileSaved: 'ప్రొఫైల్ సేవ్ చేయబడింది.', genderPlaceholder: 'ఉదా. మహిళ', agePlaceholder: 'ఉదా. 35', placePlaceholder: 'గ్రామం, జిల్లా లేదా నగరం',
    priceGraph: 'ధర గ్రాఫ్', bestMandiGraph: 'ఉత్తమ మండి ధర పోలిక', bestMandi: 'ఉత్తమ', priceAxis: 'ధర (₹)', mandiAxis: 'మండి', actionHint: 'నమ్మకంతో మీ తదుపరి అమ్మకపు నిర్ణయం తీసుకోండి.', futureForecast: 'తదుపరి 7 రోజులు', location: 'స్థలం', helpHint: 'వాతావరణం, ఋతువులు మరియు పంట ప్రణాళిక', marketHint: 'మండిలలో ఉత్తమ ధరలను పోల్చండి', profitHint: 'అమ్మకానికి ముందు ఆదాయాన్ని అంచనా వేయండి', recommendedHint: 'లాభం ఆధారంగా మీ ఉత్తమ ఎంపిక',
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_KEY).then((savedLanguage) => {
      if (translations[savedLanguage]) setLanguageState(savedLanguage);
    });
  }, []);

  async function setLanguage(nextLanguage) {
    if (!translations[nextLanguage]) return;
    setLanguageState(nextLanguage);
    await AsyncStorage.setItem(LANGUAGE_KEY, nextLanguage);
  }

  function t(key) {
    return translations[language][key] || translations.en[key] || key;
  }

  return (
    <LanguageContext.Provider value={{ language, languages, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
