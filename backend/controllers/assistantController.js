const { getFarmGuidance } = require('../services/farmGuidanceService');
const { calculateProfit } = require('../services/profitService');
const { fetchAgmarknetPage, normalizeRecord } = require('../services/importService');
const { normalizeMandiName } = require('../services/marketUtils');
const { estimateTransportation } = require('../services/transportEstimateService');
const { resolveMandiCoordinates } = require('../services/mandiCoordinateService');
const { predictTwoDayPrices } = require('../services/agmarknetForecastService');
const {
  getAgmarknetCsvCrops,
  getAgmarknetCsvMandis,
  getAgmarknetCsvPrices,
  getLiveMarketPrices,
} = require('../services/liveMarketPriceService');
const { recommendBestMandi } = require('../services/recommendationService');
const {
  getAppHelpReply,
  isMandiRecommendationQuestion,
  isPricePredictionQuestion,
} = require('../services/assistantKnowledgeService');
const {
  cropNameAliases,
  getForecastState,
  getLocationConfirmation,
  findRecentCropMention,
  resolveAssistantFollowUp,
} = require('../services/assistantConversationService');

const languageNames = {
  en: 'English',
  kn: 'Kannada',
  hi: 'Hindi',
  te: 'Telugu',
};

function normalizeText(value) {
  return value.toLowerCase().normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function greetingReply(message, language) {
  const normalized = normalizeText(message);
  const greetingPattern = /^(hi+|hello+|hey+|good morning|good afternoon|good evening|namaste|ನಮಸ್ಕಾರ|ಹಲೋ|नमस्ते|नमस्कार|హలో|నమస్కారం)( (there|friend|fren|littleleaf))?$/i;
  if (!greetingPattern.test(normalized)) return null;

  return {
    en: 'Hello! How can I help you today?',
    kn: 'ನಮಸ್ಕಾರ! ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?',
    hi: 'नमस्ते! आज मैं आपकी कैसे मदद करूँ?',
    te: 'హలో! ఈ రోజు నేను మీకు ఎలా సహాయం చేయగలను?',
  }[language];
}

function conversationalReply(message, language) {
  const normalized = normalizeText(message);
  const howAreYou = /\bhow are (?:you|u)\b|\bhow about you\b|ನೀವು ಹೇಗಿದ್ದೀರಿ|आप कैसे हैं|మీరు ఎలా ఉన్నారు/i
    .test(normalized);
  if (howAreYou) {
    return {
      en: 'I’m doing well, thanks for asking! What can I help you with?',
      kn: 'ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ, ಕೇಳಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು! ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?',
      hi: 'मैं अच्छा हूँ, पूछने के लिए धन्यवाद! मैं आपकी कैसे मदद करूँ?',
      te: 'నేను బాగున్నాను, అడిగినందుకు ధన్యవాదాలు! మీకు ఎలా సహాయం చేయాలి?',
    }[language];
  }

  if (/^(?:ok|okay|alright|all right|got it|understood|thanks|thank you|ಸರಿ|ಧನ್ಯವಾದ|ठीक है|धन्यवाद|సరే|ధన్యవాదాలు)[.! ]*$/i
    .test(normalized)) {
    return {
      en: 'Okay! What would you like to check next?',
      kn: 'ಸರಿ! ಈಗ ಏನನ್ನು ಪರಿಶೀಲಿಸಬೇಕು?',
      hi: 'ठीक है! अब आप क्या जानना चाहेंगे?',
      te: 'సరే! ఇప్పుడు మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?',
    }[language];
  }

  if (/\b(i am|i m|im|i feel|feeling|i have been)\b.*\b(sad|upset|worried|anxious|scared|lonely|angry|frustrated|happy|excited|tired|stressed|overwhelmed)\b|\b(sad|upset|worried|anxious|lonely|angry|frustrated|happy|excited|stressed)\b|ದುಃಖ|ಚಿಂತೆ|ಸಂತೋಷ|परेशान|उदास|खुश|चिंता|బాధ|ఆందోళన|సంతోషం/i
    .test(normalized)) {
    return {
      en: 'I’m sorry you’re feeling that way. Would you like to talk about it, or should I help with something on the farm?',
      kn: 'ನಿಮಗೆ ಹೀಗೆ ಅನಿಸುತ್ತಿರುವುದು ದುಃಖಕರ. ಇದರ ಬಗ್ಗೆ ಮಾತನಾಡಬೇಕೇ, ಅಥವಾ ಕೃಷಿಗೆ ಸಂಬಂಧಿಸಿದ ಯಾವುದಾದರೂ ಸಹಾಯ ಬೇಕೇ?',
      hi: 'आप ऐसा महसूस कर रहे हैं, यह सुनकर दुख हुआ। क्या आप इस बारे में बात करना चाहेंगे, या खेती से जुड़ी मदद चाहिए?',
      te: 'మీకు అలా అనిపిస్తోందని బాధగా ఉంది. దీని గురించి మాట్లాడాలనుకుంటున్నారా, లేదా వ్యవసాయంలో ఏదైనా సహాయం కావాలా?',
    }[language];
  }

  return null;
}

function clarificationReply(message, language) {
  const detail = message.trim().replace(/[?!.]+$/, '').slice(0, 80);
  return {
    en: `I’m not sure what you mean by “${detail}”. Are you asking about a crop, its mandi price, local weather, a market recommendation, or profit?`,
    kn: `“${detail}” ಎಂದರೆ ಏನು ಎಂದು ಸ್ಪಷ್ಟವಾಗಿಲ್ಲ. ಬೆಳೆ, ಮಂಡಿ ಬೆಲೆ, ಸ್ಥಳೀಯ ಹವಾಮಾನ, ಮಾರುಕಟ್ಟೆ ಶಿಫಾರಸು ಅಥವಾ ಲಾಭದ ಬಗ್ಗೆ ಕೇಳುತ್ತಿದ್ದೀರಾ?`,
    hi: `“${detail}” से आपका मतलब स्पष्ट नहीं हुआ। क्या आप फसल, मंडी भाव, स्थानीय मौसम, बाज़ार सुझाव या लाभ के बारे में पूछ रहे हैं?`,
    te: `“${detail}” అంటే ఏమిటో స్పష్టంగా లేదు. పంట, మండి ధర, స్థానిక వాతావరణం, మార్కెట్ సూచన లేదా లాభం గురించి అడుగుతున్నారా?`,
  }[language];
}

function explanationFollowUpReply(message, language, history) {
  if (!/^(?:why|how so|tell me more|can you explain|what does that mean)\b/i.test(normalizeText(message))) {
    return null;
  }
  const priorReply = Array.isArray(history)
    ? history.slice().reverse().find((item) => item?.role === 'assistant' && typeof item.content === 'string')?.content || ''
    : '';
  if (!priorReply) return null;

  if (/\b(weather|rain|temperature|humidity|wind|forecast)\b/i.test(priorReply)) {
    return {
      en: 'That answer is based on the weather data retrieved for your shared location. Which reading would you like me to explain?',
      kn: 'ಆ ಉತ್ತರವನ್ನು ನೀವು ಹಂಚಿದ ಸ್ಥಳಕ್ಕೆ ಪಡೆದ ಹವಾಮಾನ ಡೇಟಾದ ಆಧಾರದಲ್ಲಿ ನೀಡಿದ್ದೇನೆ. ಯಾವ ವಿವರವನ್ನು ವಿವರಿಸಲಿ?',
      hi: 'वह जवाब आपके साझा किए गए स्थान के मौसम डेटा पर आधारित है। किस जानकारी को समझाऊँ?',
      te: 'ఆ సమాధానం మీరు పంచుకున్న స్థానం కోసం పొందిన వాతావరణ డేటాపై ఆధారపడింది. ఏ వివరాన్ని వివరించాలి?',
    }[language];
  }
  if (/\b(profit|earnings|revenue|transport)\b/i.test(priorReply)) {
    return {
      en: 'The profit estimate uses the reported mandi price and estimated transport cost; actual sale prices and costs can differ. Which part would you like me to explain?',
      kn: 'ಲಾಭದ ಅಂದಾಜು ವರದಿಯಾದ ಮಂಡಿ ಬೆಲೆ ಮತ್ತು ಅಂದಾಜು ಸಾರಿಗೆ ವೆಚ್ಚವನ್ನು ಬಳಸುತ್ತದೆ; ನಿಜವಾದ ಬೆಲೆ ಮತ್ತು ವೆಚ್ಚ ಬದಲಾಗಬಹುದು. ಯಾವ ಭಾಗವನ್ನು ವಿವರಿಸಲಿ?',
      hi: 'लाभ का अनुमान रिपोर्ट किए गए मंडी भाव और अनुमानित परिवहन लागत पर आधारित है; वास्तविक भाव और लागत अलग हो सकते हैं। किस भाग को समझाऊँ?',
      te: 'లాభ అంచనా నివేదించిన మండి ధర, అంచనా రవాణా ఖర్చుపై ఆధారపడుతుంది; నిజమైన ధరలు, ఖర్చులు మారవచ్చు. ఏ భాగాన్ని వివరించాలి?',
    }[language];
  }
  if (/\b(agmarknet|reported price|mandi|market)\b/i.test(priorReply)) {
    return {
      en: 'Market prices come from available Agmarknet reports, so the report date matters and the price may not be a live quote. Which detail should I clarify?',
      kn: 'ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗಳು ಲಭ್ಯವಿರುವ Agmarknet ವರದಿಗಳಿಂದ ಬರುತ್ತವೆ; ಆದ್ದರಿಂದ ವರದಿ ದಿನಾಂಕ ಮುಖ್ಯ, ಮತ್ತು ಇದು ಲೈವ್ ಬೆಲೆಯಾಗಿರದೇ ಇರಬಹುದು. ಯಾವ ವಿವರ ಸ್ಪಷ್ಟಪಡಿಸಲಿ?',
      hi: 'मंडी भाव उपलब्ध Agmarknet रिपोर्ट से आते हैं; इसलिए रिपोर्ट की तारीख देखें और भाव लाइव होना जरूरी नहीं है। कौन-सी बात स्पष्ट करूँ?',
      te: 'మండి ధరలు అందుబాటులో ఉన్న Agmarknet నివేదికల నుంచి వస్తాయి; నివేదిక తేదీ ముఖ్యం, ధర లైవ్ కావాల్సిన అవసరం లేదు. ఏ వివరాన్ని స్పష్టం చేయాలి?',
    }[language];
  }
  return {
    en: 'Which part of my previous reply would you like me to explain?',
    kn: 'ನನ್ನ ಹಿಂದಿನ ಉತ್ತರದ ಯಾವ ಭಾಗವನ್ನು ವಿವರಿಸಲಿ?',
    hi: 'मेरे पिछले जवाब का कौन-सा हिस्सा समझाऊँ?',
    te: 'నా మునుపటి సమాధానంలోని ఏ భాగాన్ని వివరించాలి?',
  }[language];
}

function findCropMention(message, crops) {
  const normalizedMessage = ` ${normalizeText(message)} `;
  for (const crop of crops) {
    const normalizedCrop = normalizeText(crop.name);
    if (normalizedCrop && normalizedMessage.includes(` ${normalizedCrop} `)) return crop;
    if ((cropNameAliases[normalizedCrop] || [])
      .some((alias) => normalizedMessage.includes(` ${normalizeText(alias)} `))) return crop;
  }
  return null;
}

function findMandiMention(message, mandis) {
  const normalizedMessage = ` ${normalizeText(message)} `;
  const aliasesByMandi = {
    'Bangalore Mandi': ['bangalore', 'bengalore', 'bengaluru', 'bengalooru'],
    'Mysuru Mandi': ['mysore'],
    'Mangaluru Mandi': ['mangalore'],
  };
  const matches = [];

  for (const mandi of mandis) {
    const baseName = normalizeText(mandi.name).replace(/ mandi$/, '');
    const nameTerms = [normalizeText(mandi.name), baseName, ...(aliasesByMandi[mandi.name] || [])];
    const districtTerm = normalizeText(mandi.district || '');
    const nameMatch = nameTerms.some((term) => term && normalizedMessage.includes(` ${term} `));
    const districtMatch = districtTerm && normalizedMessage.includes(` ${districtTerm} `);
    if (nameMatch || districtMatch) matches.push({ mandi, score: nameMatch ? 2 : 1 });
  }

  return matches.sort((left, right) => right.score - left.score
    || (left.score === 1
      ? left.mandi.name.length - right.mandi.name.length
      : right.mandi.name.length - left.mandi.name.length))[0]?.mandi || null;
}

function findUnknownCropMention(message, mandis) {
  const normalized = ` ${normalizeText(message)} `;
  let remainder = normalized;
  const locationTerms = mandis.flatMap((mandi) => [
    normalizeText(mandi.name),
    normalizeText(mandi.district || ''),
    ...(mandi.name === 'Bangalore Mandi' ? ['bangalore', 'bengalore', 'bengaluru', 'bengalooru'] : []),
    ...(mandi.name === 'Mysuru Mandi' ? ['mysore'] : []),
    ...(mandi.name === 'Mangaluru Mandi' ? ['mangalore'] : []),
  ]).filter(Boolean);
  const removableTerms = [
    ...locationTerms,
    'price', 'prices', 'rate', 'rates', 'market', 'mandi', 'madi', 'crop', 'crops', 'vegetable', 'vegetables', 'veg',
    'what', 'which', 'who', 'is', 'are', 'the', 'of', 'in', 'at', 'for', 'today', 'today s', 'tell', 'me', 'show', 'give', 'please',
    'how', 'much', 'latest', 'current', 'cost', 'can', 'you', 'about', 'do', 'have', 'app', 'available',
    'i', 'we', 'my', 'our', 'your', 'farm', 'farmer', 'should', 'grow', 'growing', 'sow', 'sowing', 'plant', 'planting', 'recommend', 'recommendation',
    'suitable', 'best', 'good', 'month', 'months', 'day', 'days', 'three', 'next', 'season', 'seasonal',
    'information', 'info', 'details', 'guide', 'guidance', 'cultivate',
    'weather', 'forecast', 'rain', 'temperature', 'humidity', 'wind', 'profit', 'earning', 'earnings',
    'agriculture', 'agricultural', 'farming', 'smart raitha', 'smartraitha', 'littleleaf', 'help', 'feature', 'features',
    'transport', 'transportation', 'distance', 'estimate', 'estimated', 'estimates', 'kilometer', 'kilometers', 'km',
    'prediction', 'predictions', 'predict', 'predicted', 'price prediction', 'weather forecast',
    'near', 'nearby', 'nearest', 'closest', 'me', 'sell', 'selling', 'to', 'by', 'from', 'where', 'best mandi near me',
  ].sort((left, right) => right.length - left.length);

  for (const term of removableTerms) {
    remainder = remainder.replace(new RegExp(`(^| )${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?= |$)`, 'g'), ' ');
  }

  return remainder.trim().split(/\s+/).filter((token) => /\p{L}{3,}/u.test(token)).join(' ');
}

function hasDomainMeaning(message, crop) {
  if (crop) return true;
  const normalized = ` ${normalizeText(message)} `;
  const domainTerms = [
    'price', 'prices', 'cost', 'profit', 'market', 'mandi', 'crop', 'farm', 'farming',
    'grow', 'plant', 'seed', 'soil', 'weather', 'rain', 'fertilizer', 'pest', 'harvest',
    'sell', 'selling', 'transport', 'help', 'ಬೆಳೆ', 'ಬೆಲೆ', 'ಮಂಡಿ', 'ಲಾಭ', 'मंडी',
    'कीमत', 'फसल', 'लाभ', 'ధర', 'పంట', 'మండి', 'లాభం',
  ];
  return domainTerms.some((term) => normalized.includes(` ${normalizeText(term)} `))
    || isWeatherQuestion(message)
    || isPredictionQuestion(message)
    || isTransportQuestion(message)
    || isCropAdviceQuestion(message)
    || isAppHelpQuestion(message);
}

function isPriceQuestion(message) {
  const normalized = ` ${normalizeText(message)} `;
  return ['price', 'prices', 'rate', 'market', 'mandi', 'ಬೆಲೆ', 'कीमत', 'ధర']
    .some((term) => normalized.includes(` ${normalizeText(term)} `));
}

function isProfitQuestion(message) {
  const normalized = ` ${normalizeText(message)} `;
  return ['profit', 'earning', 'earnings', 'ಲಾಭ', 'लाभ', 'లాభం']
    .some((term) => normalized.includes(` ${normalizeText(term)} `));
}

function isWeatherQuestion(message) {
  const normalized = normalizeText(message);
  return /\b(weather|forecast|rain|temperature|humidity|wind)\b/i.test(normalized)
    || /ಹವಾಮಾನ|ಮಳೆ|ತಾಪಮಾನ|ಆರ್ದ್ರತೆ|ಗಾಳಿ|मौसम|बारिश|वर्षा|तापमान|नमी|हवा|వాతావరణం|వర్షం|ఉష్ణోగ్రత|తేమ|గాలి/i
      .test(normalized);
}

function isWeatherFeatureHelpQuestion(message) {
  const normalized = normalizeText(message);
  return /\b(how do i|how can i|how to (?:check|see|find)|where can i|where do i|where is .* (?:shown|displayed|available)|open (?:the )?(?:weather|farm help))\b/i
    .test(normalized)
    && isWeatherQuestion(normalized);
}

function isPriceFeatureHelpQuestion(message) {
  const normalized = normalizeText(message);
  return /\b(how do i|how can i|how to|where can i|where do i)\b/i.test(normalized)
    && /\b(check|compare|view|find|see|open|show|use)\b/i.test(normalized)
    && isPriceQuestion(normalized);
}

function hasExplicitAssistantIntent(message) {
  return isWeatherQuestion(message)
    || isPriceQuestion(message)
    || isProfitQuestion(message)
    || isPredictionQuestion(message)
    || isTransportQuestion(message)
    || isCropAdviceQuestion(message)
    || isMandiRecommendationQuestion(message)
    || isAppHelpQuestion(message);
}

function isPredictionQuestion(message) {
  return isPricePredictionQuestion(message);
}

function isTransportQuestion(message) {
  return /\b(transport|transportation|travel cost|distance|fuel cost)\b/i.test(normalizeText(message));
}

function isCropAdviceQuestion(message) {
  const normalized = normalizeText(message);
  const hasCropContext = /\b(crop|crops|farm|farming|field|soil|seed|grow|growing|sow|sowing|plant|planting|fertili[sz]er|pest)\b|ಬೆಳೆ|ಬಿತ್ತನೆ|ನೆಡುವ|ಬೆಳೆಸ|ಹಂಗಾಮು|ಕೃಷಿ|ಹೊಲ|ಮಣ್ಣು|ಬೀಜ|ಗೊಬ್ಬರ|ಕೀಟ|फसल|खेती|खेत|मिट्टी|बीज|बुवाई|उगाएं|खाद|कीट|పంట|వ్యవసాయం|పొలం|నేల|విత్తనం|నాటండి|సాగు|ఎరువు|తెగులు/i
    .test(normalized);
  const adviceIntent = /\b(grow|growing|sow|sowing|plant|planting|season|suitable|recommend|recommendation|best|good|guide|guidance|next three months|next 3 months|crop information|fertili[sz]er|pest|soil|seed)\b|ಬೆಳೆ|ಬಿತ್ತನೆ|ನೆಡುವ|ಬೆಳೆಸ|ಹಂಗಾಮು|ಸಲಹೆ|ಮಾರ್ಗದರ್ಶಿ|ಬೀಜ|ಗೊಬ್ಬರ|ಕೀಟ|फसल|बोना|बुवाई|उगाएं|खेती|सलाह|मार्गदर्शिका|మొక్క|విత్తనం|నాటండి|సాగు|సీజన్|సలహా|మార్గదర్శకం/i
    .test(normalized);
  return hasCropContext && adviceIntent;
}

function isAppHelpQuestion(message) {
  return /\b(app|feature|screen|how do i|how can i|where can i|use smartraitha|use the app)\b/i.test(normalizeText(message));
}

function isInScope(message, crop) {
  if (crop || isPriceQuestion(message) || isProfitQuestion(message) || isWeatherQuestion(message)
    || isPredictionQuestion(message) || isTransportQuestion(message) || isCropAdviceQuestion(message)
    || isAppHelpQuestion(message)) return true;

  const normalized = ` ${normalizeText(message)} `;
  return ['crop', 'crops', 'farm', 'farming', 'mandi', 'market', 'harvest', 'soil', 'seed', 'pest', 'fertilizer', 'transport', 'weather', 'price', 'profit', 'ಬೆಳೆ', 'ಬೆಲೆ', 'ಮಂಡಿ', 'ಲಾಭ', 'मंडी', 'कीमत', 'फसल', 'लाभ', 'ధర', 'పంట', 'మండి', 'లాభం']
    .some((term) => normalized.includes(` ${normalizeText(term)} `));
}

function parseQuantityKg(message) {
  const match = normalizeText(message).match(/\b(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilogram|kilograms)\b/);
  return match ? Number(match[1]) : null;
}

function validLocation(location) {
  return Number.isFinite(location?.latitude) && location.latitude >= -90 && location.latitude <= 90
    && Number.isFinite(location?.longitude) && location.longitude >= -180 && location.longitude <= 180;
}

function formatMandiRecommendationReply(cropName, recommendation, language) {
  if (!recommendation.recommended) {
    return {
      en: `I couldn't find a recent Agmarknet price report for ${cropName} in ${recommendation.marketScope === 'state' ? 'your state' : 'the available market data'}. Please try again later.`,
      kn: `${cropName} ಬೆಳೆಗೆ ${recommendation.marketScope === 'state' ? 'ನಿಮ್ಮ ರಾಜ್ಯದಲ್ಲಿ' : 'ಲಭ್ಯ ಮಾರುಕಟ್ಟೆ ಡೇಟಾದಲ್ಲಿ'} ಇತ್ತೀಚಿನ Agmarknet ಬೆಲೆ ವರದಿ ಸಿಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.`,
      hi: `${cropName} के लिए ${recommendation.marketScope === 'state' ? 'आपके राज्य में' : 'उपलब्ध बाज़ार डेटा में'} हाल की Agmarknet भाव रिपोर्ट नहीं मिली। कृपया बाद में फिर कोशिश करें।`,
      te: `${cropName} కోసం ${recommendation.marketScope === 'state' ? 'మీ రాష్ట్రంలో' : 'అందుబాటులో ఉన్న మార్కెట్ డేటాలో'} తాజా Agmarknet ధర నివేదిక దొరకలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.`,
    }[language];
  }

  const best = recommendation.recommended;
  const reportedDate = new Intl.DateTimeFormat(language === 'kn' ? 'kn-IN' : language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(best.reportedAt));
  const location = [best.mandi.district, best.mandi.state].filter(Boolean).join(', ');
  const qualifiedMandi = location ? `${best.mandi.name}, ${location}` : best.mandi.name;
  const usedTransportEstimate = Number.isFinite(best.estimatedNetProfit);
  const basis = usedTransportEstimate
    ? {
      en: `It is the highest estimated net return after transport for ${best.estimateQuantityKg} kg from your location (about ₹${best.estimatedNetProfit.toFixed(2)} net).`,
      kn: `ನಿಮ್ಮ ಸ್ಥಳದಿಂದ ${best.estimateQuantityKg} ಕೆಜಿಗೆ ಸಾರಿಗೆ ವೆಚ್ಚದ ನಂತರದ ಅತಿ ಹೆಚ್ಚು ಅಂದಾಜು ನಿವ್ವಳ ಆದಾಯ ಇದಾಗಿದೆ (ಸುಮಾರು ₹${best.estimatedNetProfit.toFixed(2)}).`,
      hi: `आपके स्थान से ${best.estimateQuantityKg} किलो के लिए परिवहन के बाद यह सबसे अधिक अनुमानित शुद्ध आय है (लगभग ₹${best.estimatedNetProfit.toFixed(2)}).`,
      te: `మీ స్థానం నుంచి ${best.estimateQuantityKg} కిలోలకు రవాణా ఖర్చు తర్వాత ఇదే అత్యధిక అంచనా నికర ఆదాయం (సుమారు ₹${best.estimatedNetProfit.toFixed(2)}).`,
    }[language]
    : {
      en: 'It has the highest available reported modal price; this comparison does not include transportation costs.',
      kn: 'ಲಭ್ಯ ವರದಿಗಳಲ್ಲಿ ಇದಕ್ಕೆ ಅತಿ ಹೆಚ್ಚು ಮಾದರಿ ಬೆಲೆ ಇದೆ; ಈ ಹೋಲಿಕೆಯಲ್ಲಿ ಸಾರಿಗೆ ವೆಚ್ಚ ಸೇರಿಲ್ಲ.',
      hi: 'उपलब्ध रिपोर्टों में इसका मॉडल भाव सबसे अधिक है; इस तुलना में परिवहन लागत शामिल नहीं है।',
      te: 'అందుబాటులో ఉన్న నివేదికల్లో దీని మోడల్ ధర అత్యధికం; ఈ పోలికలో రవాణా ఖర్చులు లేవు.',
    }[language];
  const pricePerKg = Number(best.modalPrice).toFixed(2);
  return {
    en: `The best mandi I found for ${cropName} is ${qualifiedMandi}, at ₹${pricePerKg}/kg (reported ${reportedDate}). ${basis} Agmarknet prices are reported prices, not guaranteed live quotes.`,
    kn: `${cropName} ಬೆಳೆಗೆ ನಾನು ಕಂಡ ಉತ್ತಮ ಮಂಡಿ ${qualifiedMandi}; ಬೆಲೆ ₹${pricePerKg}/ಕೆಜಿ (ವರದಿ ದಿನಾಂಕ ${reportedDate}). ${basis} Agmarknet ಬೆಲೆಗಳು ವರದಿಯಾದ ಬೆಲೆಗಳು; ಖಚಿತ ಲೈವ್ ದರವಲ್ಲ.`,
    hi: `${cropName} के लिए मुझे सबसे अच्छी मंडी ${qualifiedMandi} मिली; भाव ₹${pricePerKg}/किलो (रिपोर्ट ${reportedDate}). ${basis} Agmarknet भाव रिपोर्ट किए गए भाव हैं, लाइव भाव की गारंटी नहीं।`,
    te: `${cropName} కోసం నాకు దొరికిన ఉత్తమ మండి ${qualifiedMandi}; ధర ₹${pricePerKg}/కిలో (నివేదిక తేదీ ${reportedDate}). ${basis} Agmarknet ధరలు నివేదించిన ధరలు మాత్రమే; లైవ్ ధరకు హామీ కాదు.`,
  }[language];
}

function formatPredictionReply(cropName, predictions, targetDate, language, error) {
  if (error) {
    const explanation = ` ${error}`;
    return {
      en: `I couldn't generate the two-day Random Forest forecast for ${cropName}.${explanation}`,
      kn: `${cropName} ಬೆಳೆಗೆ ಎರಡು ದಿನಗಳ Random Forest ಮುನ್ಸೂಚನೆ ಸೃಷ್ಟಿಸಲಾಗಲಿಲ್ಲ.${explanation}`,
      hi: `${cropName} के लिए दो-दिन की Random Forest भविष्यवाणी नहीं बना सका।${explanation}`,
      te: `${cropName} కోసం రెండు రోజుల Random Forest అంచనాను రూపొందించలేకపోయాను.${explanation}`,
    }[language];
  }
  if (!predictions.length) {
    return {
      en: `I couldn't generate a two-day forecast for ${cropName} because no recent Agmarknet price report is available for the selected mandi or mandis.`,
      kn: `ಆಯ್ಕೆ ಮಾಡಿದ ಮಂಡಿ(ಗಳಲ್ಲಿ) ಇತ್ತೀಚಿನ Agmarknet ಬೆಲೆ ವರದಿ ಇಲ್ಲದ ಕಾರಣ ${cropName}ಗೆ ಎರಡು ದಿನಗಳ ಮುನ್ಸೂಚನೆ ಸೃಷ್ಟಿಸಲಾಗಲಿಲ್ಲ.`,
      hi: `चुनी हुई मंडी में हाल की Agmarknet भाव रिपोर्ट न होने के कारण ${cropName} की दो-दिन की भविष्यवाणी नहीं बन सकी।`,
      te: `ఎంచుకున్న మండి(ల)కు తాజా Agmarknet ధర నివేదిక లేనందున ${cropName} కోసం రెండు రోజుల అంచనా రూపొందించలేకపోయాను.`,
    }[language];
  }

  const locale = { en: 'en-IN', kn: 'kn-IN', hi: 'hi-IN', te: 'te-IN' }[language];
  const date = new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${targetDate}T00:00:00.000Z`));
  const entries = predictions.map((item) => `${item.mandiName}: ₹${Number(item.predictedPrice).toFixed(2)}/kg`);
  return {
    en: `The 10-year Karnataka Random Forest estimates ${cropName} at ${entries.join('; ')} for ${date}. Mandi estimates are adjusted using their latest reported prices. This is a prediction, not a guaranteed market price.`,
    kn: `10 ವರ್ಷಗಳ ಕರ್ನಾಟಕ Random Forest ಮಾದರಿಯು ${date}ರಂದು ${cropName} ಬೆಲೆಯನ್ನು ${entries.join('; ')} ಎಂದು ಅಂದಾಜಿಸುತ್ತದೆ. ಮಂಡಿ ಅಂದಾಜುಗಳನ್ನು ಇತ್ತೀಚಿನ ವರದಿಯಾದ ಬೆಲೆಗಳಿಂದ ಹೊಂದಿಸಲಾಗಿದೆ. ಇದು ಮುನ್ಸೂಚನೆ ಮಾತ್ರ; ಖಚಿತ ಮಾರುಕಟ್ಟೆ ಬೆಲೆಯಲ್ಲ.`,
    hi: `10-वर्षीय कर्नाटक Random Forest मॉडल के अनुसार ${date} को ${cropName} का अनुमानित भाव: ${entries.join('; ')}। मंडी के अनुमान नवीनतम रिपोर्ट किए गए भावों के अनुसार समायोजित हैं। यह भविष्यवाणी है, गारंटीकृत बाज़ार भाव नहीं।`,
    te: `10 సంవత్సరాల కర్ణాటక Random Forest నమూనా ప్రకారం ${date}న ${cropName} అంచనా ధర: ${entries.join('; ')}. మండి అంచనాలు తాజా నివేదించిన ధరలతో సర్దుబాటు చేయబడ్డాయి. ఇది అంచనా మాత్రమే; హామీ ఇచ్చిన మార్కెట్ ధర కాదు.`,
  }[language];
}

function formatUnsupportedCrop(cropName, crops, language) {
  const examples = crops.slice(0, 3).map((crop) => crop.name).join(', ');
  return {
    en: `${cropName} is not available in SmartRaitha yet. Try a supported crop such as ${examples}.`,
    kn: `${cropName}ಗೆ SmartRaithaದಲ್ಲಿ ಮಾಹಿತಿ ಇಲ್ಲ. ${examples} ಮುಂತಾದ ಲಭ್ಯ ಬೆಳೆಗಳನ್ನು ಕೇಳಿ.`,
    hi: `${cropName} की जानकारी अभी SmartRaitha में नहीं है। ${examples} जैसी उपलब्ध फसल पूछें।`,
    te: `${cropName} సమాచారం SmartRaithaలో లేదు. ${examples} వంటి అందుబాటులో ఉన్న పంటను అడగండి.`,
  }[language];
}

function formatCropPrices(crop, prices, language, requestedMandi) {
  if (prices.length === 0) {
    if (requestedMandi) {
      return {
        en: `I found ${crop.name} and ${requestedMandi.name}, but Agmarknet has no current price for that crop at that mandi.`,
        kn: `${crop.name} ಮತ್ತು ${requestedMandi.name} ಆಪ್‌ನಲ್ಲಿ ಇವೆ, ಆದರೆ ಆ ಮಂಡಿಗೆ ಈ ಬೆಳೆಯ ಬೆಲೆ ಇನ್ನೂ ಉಳಿಸಲಾಗಿಲ್ಲ.`,
        hi: `${crop.name} और ${requestedMandi.name} ऐप में हैं, लेकिन उस मंडी में इस फसल का भाव अभी दर्ज नहीं है।`,
        te: `${crop.name}, ${requestedMandi.name} యాప్‌లో ఉన్నాయి, కానీ ఆ మండిలో ఈ పంట ధర ఇంకా నమోదు కాలేదు.`,
      }[language];
    }
    return {
      en: `Agmarknet has no current mandi prices for ${crop.name}. Try another crop or check again later.`,
      kn: `${crop.name} ಬೆಳೆ ಆಪ್‌ನಲ್ಲಿ ಇದೆ, ಆದರೆ ಇದಕ್ಕೆ ಮಂಡಿ ಬೆಲೆಗಳು ಇನ್ನೂ ಉಳಿಸಲಾಗಿಲ್ಲ. ಬೇರೆ ಬೆಳೆಯನ್ನು ಪ್ರಯತ್ನಿಸಿ.`,
      hi: `${crop.name} ऐप में मौजूद है, लेकिन इसके मंडी भाव अभी उपलब्ध नहीं हैं। कोई दूसरी फसल पूछें।`,
      te: `${crop.name} పంట యాప్‌లో ఉంది, కానీ దీని మండి ధరలు ఇంకా లేవు. మరో పంట గురించి అడగండి.`,
    }[language];
  }

  const entries = prices.map((price) => {
    const date = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
    }).format(price.date);
    return `${price.mandi.name}: ₹${price.modalPrice} (${date})`;
  });
  const details = entries.join('; ');
  return {
    en: `Here are the latest reported Agmarknet ${crop.name} modal prices${requestedMandi ? ` for ${requestedMandi.name}` : ''}: ${details}. These are reported prices, not guaranteed live quotes.`,
    kn: `ಆಪ್‌ನಲ್ಲಿ ಉಳಿಸಿರುವ ${crop.name} ಬೆಳೆಗಿನ ಇತ್ತೀಚಿನ ಮಾದರಿ ಬೆಲೆಗಳು${requestedMandi ? ` (${requestedMandi.name})` : ''}: ${details}. ಇವು ದಾಖಲಾಗಿರುವ ಬೆಲೆಗಳು; ನೇರ ಲೈವ್ ದರವಲ್ಲ.`,
    hi: `ऐप में दर्ज ${crop.name} के नवीनतम मॉडल भाव${requestedMandi ? ` (${requestedMandi.name})` : ''}: ${details}। ये रिकॉर्ड किए गए भाव हैं, लाइव भाव नहीं।`,
    te: `యాప్‌లో సేవ్ చేసిన ${crop.name} తాజా మోడల్ ధరలు${requestedMandi ? ` (${requestedMandi.name})` : ''}: ${details}. ఇవి నమోదు చేసిన ధరలు, లైవ్ ధరలు కావు.`,
  }[language];
}

function localReply(message, language, crop, cropPrices, requestedMandi) {
  if (crop) return formatCropPrices(crop, cropPrices, language, requestedMandi);

  const priceQuestion = isPriceQuestion(message);
  const profitQuestion = isProfitQuestion(message);
  if (language === 'kn') {
    if (priceQuestion) return 'ಯಾವ ಬೆಳೆಯ ಬೆಲೆ ಬೇಕು? ಟೊಮೇಟೊ, ಆಲೂಗಡ್ಡೆ, ಮೆಣಸಿನಕಾಯಿ, ಈರುಳ್ಳಿ, ಅಕ್ಕಿ, ಕಡಲೆಕಾಯಿ, ಹತ್ತి లేదా ಮೆక్కెజೋಳ ಎಂದು ಕೇಳಿ.';
    if (profitQuestion) return 'ಲಾಭ ಅಂದಾಜಿಸಲು ಬೆಳೆ, ಮಂಡಿ ಮತ್ತು ಮಾರಾಟದ ಪ್ರಮಾಣ ತಿಳಿಸಿ ಅಥವಾ ಲಾಭ ಲೆಕ್ಕಾಚಾರವನ್ನು ತೆರೆಯಿರಿ.';
    return clarificationReply(message, language);
  }
  if (language === 'hi') {
    if (priceQuestion) return 'किस फसल का भाव चाहिए? टमाटर, आलू, मिर्च, प्याज़, चावल, मूंगफली, कपास या मक्का पूछें।';
    if (profitQuestion) return 'लाभ का अनुमान लगाने के लिए फसल, मंडी और मात्रा बताएं, या लाभ कैलकुलेटर खोलें।';
    return clarificationReply(message, language);
  }
  if (language === 'te') {
    if (priceQuestion) return 'ఏ పంట ధర కావాలి? టమాటా, బంగాళాదుంప, మిర్చి, ఉల్లి, వరి, వేరుశెనగ, పత్తి లేదా మొక్కజొన్న గురించి అడగండి.';
    if (profitQuestion) return 'లాభం అంచనా వేయడానికి పంట, మండి, పరిమాణం చెప్పండి లేదా లాభ కాలిక్యులేటర్ తెరవండి.';
    return clarificationReply(message, language);
  }
  if (priceQuestion) return 'Which crop price do you need? For example, onion or tomato.';
  if (profitQuestion) return 'Tell me the crop, mandi, and quantity to estimate profit, or open the Profit Calculator.';
  return clarificationReply(message, language);
}

function buildScopedReply(message, language, context) {
  const {
    crop, cropPrices, requestedMandi, transportEstimate, transportError,
    quantityKg, profit, profitError, prediction, predictionError, weather, hasLocation,
    placeName,
  } = context;

  if (isProfitQuestion(message)) {
    if (!crop) {
      return {
        en: 'Which crop would you like to calculate profit for?',
        kn: 'ಯಾವ ಬೆಳೆಗೆ ಲಾಭ ಲೆಕ್ಕಿಸಬೇಕು?',
        hi: 'किस फसल का लाभ निकालना है?',
        te: 'ఏ పంటకు లాభం లెక్కించాలి?',
      }[language];
    }
    if (!requestedMandi) {
      return {
        en: `Which mandi should I use for ${crop.name}?`,
        kn: `${crop.name}ಗೆ ಯಾವ ಮಂಡಿಯನ್ನು ಬಳಸಬೇಕು?`,
        hi: `${crop.name} के लिए कौन-सी मंडी इस्तेमाल करूँ?`,
        te: `${crop.name} కోసం ఏ మండి ఉపయోగించాలి?`,
      }[language];
    }
    if (!quantityKg) {
      return {
        en: `What quantity of ${crop.name} are you planning to sell at ${requestedMandi.name}, in kilograms?`,
        kn: `${requestedMandi.name}ನಲ್ಲಿ ಮಾರಲು ${crop.name} ಎಷ್ಟು ಕೆಜಿ ಇದೆ?`,
        hi: `${requestedMandi.name} में बेचने के लिए ${crop.name} की मात्रा कितने किलो है?`,
        te: `${requestedMandi.name}లో అమ్మడానికి ${crop.name} పరిమాణం ఎన్ని కిలోలు?`,
      }[language];
    }
    if (profitError) {
      return {
        en: `I could not calculate profit from current Agmarknet and route data: ${profitError}`,
        kn: `ಪ್ರಸ್ತುತ Agmarknet ಮತ್ತು ಮಾರ್ಗದ ಡೇಟಾದಿಂದ ಲಾಭ ಲೆಕ್ಕಿಸಲಾಗಲಿಲ್ಲ: ${profitError}`,
        hi: `मौजूदा Agmarknet और मार्ग डेटा से लाभ नहीं निकाल सका: ${profitError}`,
        te: `ప్రస్తుత Agmarknet మరియు మార్గ డేటాతో లాభం లెక్కించలేకపోయాను: ${profitError}`,
      }[language];
    }
    if (!profit) {
      return {
        en: `I could not calculate profit for ${crop.name} at ${requestedMandi.name}.`,
        kn: `${requestedMandi.name}ನಲ್ಲಿ ${crop.name}ಗೆ ಲಾಭ ಲೆಕ್ಕಿಸಲಾಗಲಿಲ್ಲ.`,
        hi: `${requestedMandi.name} में ${crop.name} का लाभ नहीं निकाल सका।`,
        te: `${requestedMandi.name}లో ${crop.name}కు లాభం లెక్కించలేకపోయాను.`,
      }[language];
    }
    return {
      en: `For ${quantityKg} kg of ${crop.name} at ${requestedMandi.name}, using the latest reported Agmarknet price, estimated gross revenue is ₹${profit.grossRevenue.toFixed(2)}, estimated transport is ₹${profit.transportCost.toFixed(2)}, and estimated net earnings are ₹${profit.netProfit.toFixed(2)}. This is an estimate.`,
      kn: `${requestedMandi.name}ನಲ್ಲಿ ${quantityKg} ಕೆಜಿ ${crop.name}ಗೆ ಇತ್ತೀಚಿನ Agmarknet ವರದಿ ಬೆಲೆಯಂತೆ ಅಂದಾಜು ಒಟ್ಟು ಆದಾಯ ₹${profit.grossRevenue.toFixed(2)}, ಸಾರಿಗೆ ವೆಚ್ಚ ₹${profit.transportCost.toFixed(2)}, ನಿವ್ವಳ ಆದಾಯ ₹${profit.netProfit.toFixed(2)}. ಇದು ಅಂದಾಜು.`,
      hi: `${requestedMandi.name} में ${quantityKg} किलो ${crop.name} के लिए नवीनतम Agmarknet भाव के अनुसार अनुमानित कुल आय ₹${profit.grossRevenue.toFixed(2)}, परिवहन लागत ₹${profit.transportCost.toFixed(2)} और शुद्ध कमाई ₹${profit.netProfit.toFixed(2)} है। यह अनुमान है।`,
      te: `${requestedMandi.name}లో ${quantityKg} కిలోల ${crop.name}కు తాజా Agmarknet ధర ప్రకారం అంచనా స్థూల ఆదాయం ₹${profit.grossRevenue.toFixed(2)}, రవాణా ఖర్చు ₹${profit.transportCost.toFixed(2)}, నికర ఆదాయం ₹${profit.netProfit.toFixed(2)}. ఇది అంచనా మాత్రమే.`,
    }[language];
  }

  if (isWeatherQuestion(message)) {
    if (!hasLocation) {
      return {
        en: 'Please allow location access so I can check your local weather.',
        kn: 'ನಿಮ್ಮ ಸ್ಥಳದ ಹವಾಮಾನ ಪರಿಶೀಲಿಸಲು ಸ್ಥಳ ಪ್ರವೇಶವನ್ನು ಅನುಮತಿಸಿ.',
        hi: 'आपके स्थानीय मौसम की जानकारी के लिए स्थान अनुमति दें।',
        te: 'మీ ప్రాంత వాతావరణం కోసం లొకేషన్ అనుమతించండి.',
      }[language];
    }
    if (!weather) {
      return {
        en: 'I could not retrieve your weather right now. Please try again shortly.',
        kn: 'ಈಗ ಹವಾಮಾನ ಪಡೆಯಲಾಗಲಿಲ್ಲ. ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
        hi: 'अभी मौसम नहीं मिल सका। थोड़ी देर बाद फिर कोशिश करें।',
        te: 'ఇప్పుడు వాతావరణం పొందలేకపోయాను. కొద్దిసేపటి తర్వాత ప్రయత్నించండి.',
      }[language];
    }
    const current = weather.current;
    const normalized = normalizeText(message);
    const asksForecast = /\b(tomorrow|forecast|will(?: it)? rain|rain tomorrow|chance of rain|next \d+ days?)\b|ನಾಳೆ|ಮುನ್ಸೂಚನೆ|ಮಳೆ ಸಾಧ್ಯತೆ|कल|पूर्वानुमान|बारिश की संभावना|రేపు|అంచనా|వర్షం అవకాశం/i
      .test(normalized);
    if (asksForecast && weather.daily?.time?.length) {
      const dayIndex = /\btomorrow\b|ನಾಳೆ|कल|రేపు/i.test(normalized) ? 1 : 0;
      const date = weather.daily.time[dayIndex];
      const high = weather.daily.temperature_2m_max?.[dayIndex];
      const low = weather.daily.temperature_2m_min?.[dayIndex];
      const rainChance = weather.daily.precipitation_probability_max?.[dayIndex];
      const dateLabel = date
        ? new Intl.DateTimeFormat({ en: 'en-IN', kn: 'kn-IN', hi: 'hi-IN', te: 'te-IN' }[language], {
          timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short',
        }).format(new Date(`${date}T00:00:00.000Z`))
        : '';
      const prefix = {
        en: `${dateLabel ? `Forecast for ${dateLabel}` : 'Forecast'}${placeName ? ` in ${placeName}` : ''}`,
        kn: `${dateLabel ? `${dateLabel}ರ` : 'ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ'}${placeName ? ` (${placeName})` : ''}`,
        hi: `${dateLabel ? `${dateLabel} का पूर्वानुमान` : 'पूर्वानुमान'}${placeName ? ` (${placeName})` : ''}`,
        te: `${dateLabel ? `${dateLabel} వాతావరణ అంచనా` : 'వాతావరణ అంచనా'}${placeName ? ` (${placeName})` : ''}`,
      }[language];
      const temperature = Number.isFinite(low) && Number.isFinite(high) ? `${low}–${high}°C` : '';
      const rain = Number.isFinite(rainChance) ? {
        en: `${rainChance}% chance of rain`,
        kn: `ಮಳೆಯ ಸಾಧ್ಯತೆ ${rainChance}%`,
        hi: `बारिश की संभावना ${rainChance}%`,
        te: `వర్షం పడే అవకాశం ${rainChance}%`,
      }[language] : '';
      const forecastDetails = [temperature, rain].filter(Boolean);
      if (forecastDetails.length === 0) {
        return {
          en: 'I could not retrieve your weather forecast right now. Please try again shortly.',
          kn: 'ಈಗ ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ ಪಡೆಯಲಾಗಲಿಲ್ಲ. ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಪ್ರಯತ್ನಿಸಿ.',
          hi: 'अभी मौसम का पूर्वानुमान नहीं मिल सका। थोड़ी देर बाद कोशिश करें।',
          te: 'ఇప్పుడు వాతావరణ అంచనా పొందలేకపోయాను. కొద్దిసేపటి తర్వాత ప్రయత్నించండి.',
        }[language];
      }
      return `${prefix}: ${forecastDetails.join(', ')}.`;
    }
    return {
      en: `Current weather${placeName ? ` in ${placeName}` : ''}: ${current.temperature_2m}°C, humidity ${current.relative_humidity_2m}%, rain ${current.precipitation} mm, wind ${current.wind_speed_10m} km/h.`,
      kn: `${placeName ? `${placeName}ನಲ್ಲಿ ` : ''}ಪ್ರಸ್ತುತ ಹವಾಮಾನ: ${current.temperature_2m}°C, ತೇವಾಂಶ ${current.relative_humidity_2m}%, ಮಳೆ ${current.precipitation} ಮಿಮೀ, ಗಾಳಿ ${current.wind_speed_10m} ಕಿಮೀ/ಗಂ.`,
      hi: `${placeName ? `${placeName} में ` : ''}अभी मौसम: ${current.temperature_2m}°C, नमी ${current.relative_humidity_2m}%, वर्षा ${current.precipitation} मिमी, हवा ${current.wind_speed_10m} किमी/घंटा।`,
      te: `${placeName ? `${placeName}లో ` : ''}ప్రస్తుత వాతావరణం: ${current.temperature_2m}°C, తేమ ${current.relative_humidity_2m}%, వర్షపాతం ${current.precipitation} మిమీ, గాలి ${current.wind_speed_10m} కి.మీ/గం.`,
    }[language];
  }

  if (isCropAdviceQuestion(message)) {
    const normalizedAdviceRequest = normalizeText(message);
    const asksLongTerm = /\b(next three months|next 3 months|three months|3 months)\b|ಮುಂದಿನ ಮೂರು ತಿಂಗಳು|अगले तीन महीने|अगले 3 महीने|తదుపరి మూడు నెలలు/i
      .test(normalizedAdviceRequest);
    if (asksLongTerm) {
      if (!hasLocation) {
        return {
          en: 'SmartRaitha has a seven-day forecast, not a three-month forecast. Please allow location access to check current seasonal guidance.',
          kn: 'SmartRaithaದಲ್ಲಿ 7 ದಿನಗಳ ಮುನ್ಸೂಚನೆ ಇದೆ, 3 ತಿಂಗಳದ್ದಲ್ಲ. ಪ್ರಸ್ತುತ ಋತುಮಾನ ಸಲಹೆಗೆ ಸ್ಥಳ ಪ್ರವೇಶ ಅನುಮತಿಸಿ.',
          hi: 'SmartRaitha में 7 दिन का पूर्वानुमान है, 3 महीने का नहीं। मौजूदा मौसमी सलाह के लिए स्थान अनुमति दें।',
          te: 'SmartRaithaలో 7 రోజుల అంచనా మాత్రమే ఉంది, 3 నెలలది కాదు. ప్రస్తుత సీజనల్ సూచన కోసం లొకేషన్ అనుమతించండి.',
        }[language];
      }
      if (!weather?.seasonalAdvice) {
        return {
          en: 'SmartRaitha has a seven-day forecast, not a three-month forecast. I could not retrieve the current seasonal guide.',
          kn: 'SmartRaithaದಲ್ಲಿ 7 ದಿನಗಳ ಮುನ್ಸೂಚನೆ ಇದೆ, 3 ತಿಂಗಳದ್ದಲ್ಲ. ಈಗಿನ ಋತುಮಾನ ಮಾರ್ಗದರ್ಶಿ ಪಡೆಯಲಾಗಲಿಲ್ಲ.',
          hi: 'SmartRaitha में 7 दिन का पूर्वानुमान है, 3 महीने का नहीं। मौजूदा मौसमी सलाह नहीं मिल सकी।',
          te: 'SmartRaithaలో 7 రోజుల అంచనా మాత్రమే ఉంది, 3 నెలలది కాదు. ప్రస్తుత సీజనల్ గైడ్ పొందలేకపోయాను.',
        }[language];
      }
    }
    if (crop) {
      return {
        en: `${crop.name} is supported, but SmartRaitha does not have a detailed growing guide for it yet.`,
        kn: `${crop.name} ಆಪ್‌ನಲ್ಲಿ ಇದೆ, ಆದರೆ ಅದಕ್ಕೆ ವಿವರವಾದ ಬೆಳೆ ಮಾರ್ಗದರ್ಶಿ ಇನ್ನೂ ಲಭ್ಯವಿಲ್ಲ.`,
        hi: `${crop.name} ऐप में उपलब्ध है, लेकिन इसकी विस्तृत खेती मार्गदर्शिका अभी नहीं है।`,
        te: `${crop.name} యాప్‌లో ఉంది, కానీ దీనికి వివరమైన సాగు మార్గదర్శకం ఇంకా లేదు.`,
      }[language];
    }
    if (!hasLocation) {
      return {
        en: 'Please allow location access so I can use your local weather for crop guidance.',
        kn: 'ಸ್ಥಳೀಯ ಹವಾಮಾನ ಆಧಾರಿತ ಬೆಳೆ ಸಲಹೆಗೆ ಸ್ಥಳ ಪ್ರವೇಶವನ್ನು ಅನುಮತಿಸಿ.',
        hi: 'स्थानीय मौसम के आधार पर फसल सलाह के लिए स्थान अनुमति दें।',
        te: 'స్థానిక వాతావరణం ఆధారంగా పంట సూచన కోసం లొకేషన్ అనుమతించండి.',
      }[language];
    }
    if (!weather?.seasonalAdvice) {
      return {
        en: 'I could not retrieve local crop guidance right now. Please try again shortly.',
        kn: 'ಈಗ ಸ್ಥಳೀಯ ಬೆಳೆ ಸಲಹೆ ಪಡೆಯಲಾಗಲಿಲ್ಲ. ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಪ್ರಯತ್ನಿಸಿ.',
        hi: 'अभी स्थानीय फसल सलाह नहीं मिल सकी। थोड़ी देर बाद कोशिश करें।',
        te: 'ఇప్పుడు స్థానిక పంట సూచన పొందలేకపోయాను. కొద్దిసేపటి తర్వాత ప్రయత్నించండి.',
      }[language];
    }
    const advice = weather.seasonalAdvice;
    return {
      en: `${asksLongTerm ? 'SmartRaitha provides a seven-day forecast, not a three-month forecast. ' : ''}For ${advice.region} in ${advice.window}, it suggests ${advice.crop}: ${advice.reason}`,
      kn: `${advice.window}ರಲ್ಲಿ ${advice.region}ಗೆ ${advice.crop} ಸೂಕ್ತ ಆಯ್ಕೆ. ಬಿತ್ತುವ ಮೊದಲು ಮಣ್ಣು ಮತ್ತು ನೀರಿನ ಲಭ್ಯತೆ ಪರಿಶೀಲಿಸಿ.`,
      hi: `${advice.window} में ${advice.region} के लिए ${advice.crop} एक अच्छा विकल्प है। बोने से पहले मिट्टी और पानी की उपलब्धता जाँचें।`,
      te: `${advice.window}లో ${advice.region}కు ${advice.crop} మంచి ఎంపిక. విత్తే ముందు నేల, నీటి లభ్యతను చూసుకోండి.`,
    }[language];
  }

  if (isPriceQuestion(message) && !crop) {
    return {
      en: 'Which crop price do you need? For example, onion or tomato.',
      kn: 'ಯಾವ ಬೆಳೆಯ ಬೆಲೆ ಬೇಕು? ಉದಾಹರಣೆಗೆ, ಈರುಳ್ಳಿ ಅಥವಾ ಟೊಮೇಟೊ.',
      hi: 'किस फसल का भाव चाहिए? उदाहरण के लिए, प्याज़ या टमाटर।',
      te: 'ఏ పంట ధర కావాలి? ఉదాహరణకు, ఉల్లి లేదా టమాటా.',
    }[language];
  }

  if (language !== 'en') return localReply(message, language, crop, cropPrices, requestedMandi);

  if (isPredictionQuestion(message)) {
    if (!crop || !requestedMandi) return 'Which crop and mandi should I check for a two-day price forecast?';
    if (predictionError) return `I could not generate an Agmarknet forecast: ${predictionError}`;
    if (!prediction) return `Agmarknet does not have enough recent reports to forecast ${crop.name} at ${requestedMandi.name}.`;
    const date = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(prediction.predictedDate));
    return `Based on recent Agmarknet reports, the backend estimates ${crop.name} at ${requestedMandi.name} at ₹${prediction.predictedPrice} per kg for ${date}. This is an estimate, not a guaranteed market price.`;
  }

  if (isTransportQuestion(message)) {
    if (!requestedMandi) return 'Which mandi should I check transportation costs for?';
    if (!hasLocation) return 'Allow location access so the backend can calculate a driving route to the mandi.';
    if (transportError) return `I could not estimate transportation to ${requestedMandi.name}: ${transportError}`;
    if (!transportEstimate) return `I could not calculate a route to ${requestedMandi.name}.`;
    return `The backend estimates transportation to ${requestedMandi.name} at ₹${transportEstimate.transportationCost.toFixed(2)} for a ${transportEstimate.distanceKm.toFixed(1)} km driving route, using the configured ₹${transportEstimate.ratePerKm}/km rate. This is an estimate.`;
  }

  if (isPriceQuestion(message) || crop) {
    if (!crop) return 'Which crop’s mandi price would you like?';
    return formatCropPrices(crop, cropPrices, language, requestedMandi);
  }

  if (isAppHelpQuestion(message)) return 'SmartRaitha supports saved mandi prices and comparisons, profit estimates, location-based weather and seasonal guidance, and saved two-day price predictions.';
  return clarificationReply(message, language);
}

async function askAssistant(req, res) {
  try {
    const { message, language = 'en', history, location } = req.body;
    const trimmedMessage = typeof message === 'string' ? message.trim() : '';
    if (!trimmedMessage) return res.status(400).json({ error: 'message is required.' });
    if (!languageNames[language]) return res.status(400).json({ error: 'Unsupported language.' });

    const locationConfirmation = getLocationConfirmation(trimmedMessage, history);
    if (locationConfirmation === 'declined') {
      return res.json({
        reply: {
          en: 'No problem. I need location access only for nearby mandi and local weather results.',
          kn: 'ಪರವಾಗಿಲ್ಲ. ಹತ್ತಿರದ ಮಂಡಿ ಮತ್ತು ಸ್ಥಳೀಯ ಹವಾಮಾನಕ್ಕೆ ಮಾತ್ರ ಸ್ಥಳ ಪ್ರವೇಶ ಬೇಕು.',
          hi: 'कोई बात नहीं। पास की मंडी और स्थानीय मौसम बताने के लिए ही स्थान अनुमति चाहिए।',
          te: 'పర్వాలేదు. దగ్గరి మండి, స్థానిక వాతావరణం కోసం మాత్రమే లొకేషన్ అవసరం.',
        }[language],
        source: 'local',
      });
    }
    if (locationConfirmation === 'accepted' && !validLocation(location)) {
      return res.json({
        reply: {
          en: 'I still cannot access your location. Please allow location permission in your phone settings and try again.',
          kn: 'ನಿಮ್ಮ ಸ್ಥಳ ಇನ್ನೂ ಲಭ್ಯವಿಲ್ಲ. ಫೋನ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ ಸ್ಥಳ ಅನುಮತಿಸಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
          hi: 'मुझे अभी भी आपका स्थान नहीं मिला। फोन सेटिंग्स में स्थान अनुमति देकर फिर कोशिश करें।',
          te: 'మీ స్థానం ఇంకా అందలేదు. ఫోన్ సెట్టింగ్‌లలో లొకేషన్ అనుమతించి మళ్లీ ప్రయత్నించండి.',
        }[language],
        source: 'local',
      });
    }

    if (locationConfirmation !== 'accepted' && !hasExplicitAssistantIntent(trimmedMessage)) {
      const explanationReply = explanationFollowUpReply(trimmedMessage, language, history);
      if (explanationReply) return res.json({ reply: explanationReply, source: 'local' });
      const socialReply = conversationalReply(trimmedMessage, language);
      if (socialReply) return res.json({ reply: socialReply, source: 'local' });
      const greeting = greetingReply(trimmedMessage, language);
      if (greeting) return res.json({ reply: greeting, source: 'local' });
    }
    const [crops, mandis] = await Promise.all([
      getAgmarknetCsvCrops(),
      getAgmarknetCsvMandis(),
    ]);
    const currentCrop = findCropMention(trimmedMessage, crops);
    const currentMandi = findMandiMention(trimmedMessage, mandis);
    const recommendationFollowUp = isMandiRecommendationQuestion(trimmedMessage) && !currentCrop;
    const previousCrop = recommendationFollowUp ? findRecentCropMention(history, crops, cropNameAliases) : null;
    const conversation = resolveAssistantFollowUp(
      trimmedMessage,
      history,
      Boolean(currentCrop || currentMandi),
    );
    const effectiveMessage = previousCrop
      ? `${conversation.message} ${previousCrop.name}`
      : conversation.message;
    const crop = currentCrop || previousCrop || findCropMention(effectiveMessage, crops);
    const requestedMandi = currentMandi || findMandiMention(effectiveMessage, mandis);
    const normalizedMessage = normalizeText(effectiveMessage);
    const asksAboutCrop = isPriceQuestion(effectiveMessage) || isCropAdviceQuestion(effectiveMessage)
      || /\b(crop|crops|vegetable|vegetables|veggie|fruit|fruits|what is|which)\b/.test(normalizedMessage);
    const unknownCrop = !crop && asksAboutCrop ? findUnknownCropMention(effectiveMessage, mandis) : '';
    if (unknownCrop) {
      return res.json({ reply: formatUnsupportedCrop(unknownCrop, crops, language), source: 'local' });
    }
    if (isPredictionQuestion(effectiveMessage)) {
      if (!crop) {
        return res.json({
          reply: {
            en: 'Which crop would you like me to forecast for two days from now?',
            kn: 'ಇನ್ನೆರಡು ದಿನಗಳ ಬೆಲೆ ಮುನ್ಸೂಚನೆಗೆ ಯಾವ ಬೆಳೆ ಬೇಕು?',
            hi: 'दो दिन बाद की कीमत का अनुमान किस फसल के लिए चाहिए?',
            te: 'రెండు రోజుల తర్వాత ధర అంచనా ఏ పంటకు కావాలి?',
          }[language],
          source: 'local',
        });
      }

      const state = getForecastState(requestedMandi);

      const target = new Date();
      target.setUTCDate(target.getUTCDate() + 2);
      const targetDate = target.toISOString().slice(0, 10);
      let forecastPredictions = [];
      let predictionError = '';
      try {
        const mandiNames = requestedMandi
          ? [requestedMandi.name]
          : [...new Set((await getLiveMarketPrices({ cropName: crop.name, state })).prices
            .map((price) => price.mandiName)
            .filter(Boolean))];
        if (mandiNames.length === 0) {
          throw new Error(`No saved Agmarknet prices were found for ${crop.name} in ${state}.`);
        }

        const forecast = await predictTwoDayPrices({
          cropName: crop.name,
          state,
          mandiNames,
          targetDate,
        });
        const targetDayPredictions = forecast.predictions
          .filter((item) => item.predictedDate === targetDate)
          .sort((left, right) => right.predictedPrice - left.predictedPrice);
        forecastPredictions = requestedMandi ? targetDayPredictions.slice(0, 1) : targetDayPredictions.slice(0, 3);
      } catch (error) {
        predictionError = error.message;
      }

      return res.json({
        reply: formatPredictionReply(crop.name, forecastPredictions, targetDate, language, predictionError),
        source: 'local',
      });
    }
    if (isMandiRecommendationQuestion(effectiveMessage)) {
      if (!crop) {
        return res.json({
          reply: {
            en: `Which crop should I find a mandi for? For example, ${crops.slice(0, 3).map((item) => item.name).join(', ')}.`,
            kn: `ಯಾವ ಬೆಳೆಗೆ ಮಂಡಿ ಹುಡುಕಬೇಕು? ಉದಾಹರಣೆಗೆ, ${crops.slice(0, 3).map((item) => item.name).join(', ')}.`,
            hi: `किस फसल के लिए मंडी खोजूँ? उदाहरण के लिए, ${crops.slice(0, 3).map((item) => item.name).join(', ')}।`,
            te: `ఏ పంటకు మండి వెతకాలి? ఉదాహరణకు, ${crops.slice(0, 3).map((item) => item.name).join(', ')}.`,
          }[language],
          source: 'local',
        });
      }
      if (!location?.state) {
        const locationMessage = validLocation(location)
          ? {
            en: 'I have your coordinates but could not identify your state. Check location services and try again.',
            kn: 'ನಿಮ್ಮ ಸ್ಥಳದ ನಿರ್ದೇಶಾಂಕಗಳಿವೆ, ಆದರೆ ರಾಜ್ಯ ಗುರುತಿಸಲಾಗಲಿಲ್ಲ. ಸ್ಥಳ ಸೇವೆ ಪರಿಶೀಲಿಸಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
            hi: 'स्थान के निर्देशांक मिले, लेकिन राज्य की पहचान नहीं हुई। स्थान सेवाएँ जाँचकर फिर कोशिश करें।',
            te: 'మీ స్థాన కోఆర్డినేట్లు అందాయి, కానీ రాష్ట్రం గుర్తించలేకపోయాను. లొకేషన్ సేవలను చూసి మళ్లీ ప్రయత్నించండి.',
          }[language]
          : {
            en: `Please allow location access so I can find the best ${crop.name} mandi near you.`,
            kn: `ನಿಮ್ಮ ಹತ್ತಿರದ ಉತ್ತಮ ${crop.name} ಮಂಡಿ ಹುಡುಕಲು ಸ್ಥಳ ಪ್ರವೇಶವನ್ನು ಅನುಮತಿಸಿ.`,
            hi: `पास की सबसे अच्छी ${crop.name} मंडी खोजने के लिए स्थान अनुमति दें।`,
            te: `మీకు దగ్గరలోని ఉత్తమ ${crop.name} మండి కనుగొనడానికి లొకేషన్ అనుమతించండి.`,
          }[language];
        return res.json({
          reply: locationMessage,
          source: 'local',
        });
      }

      const recommendation = await recommendBestMandi({
        cropName: crop.name,
        state: location.state,
        district: location.district,
        ...(validLocation(location) ? {
          originLatitude: location.latitude,
          originLongitude: location.longitude,
        } : {}),
      });
      return res.json({
        reply: formatMandiRecommendationReply(crop.name, recommendation, language),
        source: 'local',
      });
    }
    if (!isProfitQuestion(effectiveMessage)
      && (!isWeatherQuestion(effectiveMessage) || isWeatherFeatureHelpQuestion(effectiveMessage))
      && (!crop || !isPriceQuestion(effectiveMessage) || isPriceFeatureHelpQuestion(effectiveMessage))) {
      const appHelpReply = getAppHelpReply(effectiveMessage, language);
      if (appHelpReply) return res.json({ reply: appHelpReply, source: 'local' });
    }
    if (!isInScope(effectiveMessage, crop)) {
      return res.json({ reply: clarificationReply(trimmedMessage, language), source: 'local' });
    }

    const hasLocation = validLocation(location);
    let weather = null;
    if ((isWeatherQuestion(effectiveMessage) || isCropAdviceQuestion(effectiveMessage)) && hasLocation) {
      try {
        weather = await getFarmGuidance({ latitude: location.latitude, longitude: location.longitude });
      } catch (error) {
        console.error('Assistant weather lookup failed:', error.message);
      }
    }

    const liveState = requestedMandi?.state || location?.state;
    const reportedPrices = [];
    if (crop) {
      try {
        const liveRecords = await fetchAgmarknetPage({
          filters: {
            ...(liveState ? { 'state.keyword': liveState } : {}),
            'commodity.keyword': crop.name,
          },
          limit: 100,
        });
        reportedPrices.push(...liveRecords.map(normalizeRecord));
      } catch (error) {
        console.warn('Assistant live price lookup failed; checking saved reports:', error.message);
      }
      if (liveState) {
        reportedPrices.push(...await getAgmarknetCsvPrices({ cropName: crop.name, state: liveState }));
      }
    }
    const latestPricesByMandi = new Map();
    for (const price of reportedPrices) {
      if (!price.mandiName || !price.date || price.modalPrice == null || price.modalPrice <= 0) continue;
      const key = [price.state, price.district || '', price.mandiName].join('|').toLocaleLowerCase();
      const current = latestPricesByMandi.get(key);
      if (!current || price.date > current.date) {
        latestPricesByMandi.set(key, {
          mandi: { name: price.mandiName, district: price.district, state: price.state },
          modalPrice: price.modalPrice,
          date: price.date,
        });
      }
    }
    const cropPrices = [...latestPricesByMandi.values()]
      .filter((price) => !requestedMandi
        || normalizeMandiName(price.mandi.name) === normalizeMandiName(requestedMandi.name))
      .sort((left, right) => right.modalPrice - left.modalPrice)
      .slice(0, 5);

    const quantityKg = parseQuantityKg(effectiveMessage) || conversation.quantityKg;

    let profit = null;
    let profitError = '';
    if (isProfitQuestion(effectiveMessage) && crop && requestedMandi && quantityKg) {
      try {
        profit = await calculateProfit({
          cropName: crop.name,
          state: requestedMandi.state,
          mandiName: requestedMandi.name,
          quantityKg,
          originLatitude: location?.latitude,
          originLongitude: location?.longitude,
        });
      } catch (error) {
        profitError = error.message;
      }
    }

    let transportEstimate = null;
    let transportError = '';
    if (isTransportQuestion(effectiveMessage) && requestedMandi && hasLocation) {
      try {
        transportEstimate = await estimateTransportation({
          originLatitude: location.latitude,
          originLongitude: location.longitude,
          destination: [requestedMandi.name, requestedMandi.district, requestedMandi.state, 'India']
            .filter(Boolean).join(', '),
          destinationCoordinates: await resolveMandiCoordinates(
            requestedMandi.name,
            requestedMandi.district,
            requestedMandi.state,
          ),
        });
      } catch (error) {
        transportError = error.message;
      }
    }

    const assistantContext = {
      crop,
      crops,
      cropPrices,
      requestedMandi,
      transportEstimate,
      transportError,
      quantityKg,
      profit,
      profitError,
      prediction: null,
      predictionError: '',
      weather,
      hasLocation,
      placeName: location?.placeName || location?.district || location?.state || '',
    };

    return res.json({ reply: buildScopedReply(effectiveMessage, language, assistantContext), source: 'local' });
  } catch (err) {
    console.error('Assistant request failed:', err.message);
    res.status(500).json({ error: 'The assistant could not complete your request. Please try again.' });
  }
}

module.exports = {
  askAssistant,
  buildScopedReply,
  conversationalReply,
  clarificationReply,
  explanationFollowUpReply,
  isWeatherFeatureHelpQuestion,
  isPriceFeatureHelpQuestion,
  hasExplicitAssistantIntent,
};
