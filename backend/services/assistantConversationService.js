const cropNameAliases = {
  chilli: ['chili', 'chillies', 'chilies', 'chiili', 'chilli pepper', 'ಮೆಣಸಿನಕಾಯಿ', 'मिर्च', 'మిర్చి'],
  'green chilli': ['green chili', 'green chillies', 'green chilies', 'green chilly', 'ಹಸಿರು ಮೆಣಸಿನಕಾಯಿ', 'हरी मिर्च', 'పచ్చిమిర్చి'],
  tomato: ['tomatoes', 'ಟೊಮೇಟೊ', 'ಟೊಮ್ಯಾಟೊ', 'टमाटर', 'టమాటా'],
  onion: ['onions', 'ಈರುಳ್ಳಿ', 'प्याज़', 'प्याज', 'ఉల్లి'],
  potato: ['potatoes', 'ಆಲೂಗಡ್ಡೆ', 'आलू', 'బంగాళాదుంప'],
  rice: ['ಅಕ್ಕಿ', 'चावल', 'వరి'],
  maize: ['ಮೆಕ್ಕೆಜೋಳ', 'मक्का', 'మొక్కజొన్న'],
  groundnut: ['ಕಡಲೆಕಾಯಿ', 'मूंगफली', 'వేరుశెనగ'],
};

function sanitizeAssistantHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
    .slice(-12)
    .map((item) => ({ role: item.role, content: item.content.trim().slice(0, 1200) }))
    .filter((item) => item.content);
}

function isProfitIntent(message) {
  return /\b(profit|earning|earnings|income|calculate profit|estimate profit|how much (?:will|would) i (?:get|earn))\b|ಲಾಭ|लಾಭ|లాభం/i.test(message);
}

function isAssistantTaskRequest(message) {
  return /\b(price|prices|rate|market|mandi|profit|earning|income|forecast|predict|weather|rain|transport|crop|grow|sow|plant|recommend|soil|seed|pest|fertili[sz]er)\b|ಬೆಲೆ|ಮಂಡಿ|ಲಾಭ|ಬೆಳೆ|ಹವಾಮಾನ|ಮಳೆ|कीमत|मंडी|लाभ|फसल|मौसम|ధర|మండి|లాభం|పంట|వాతావరణం/i
    .test(message);
}

function isClarificationPrompt(message) {
  return /\b(allow location access|which crop|what crop|which mandi|what mandi|what quantity|how many|in kilograms?|how much .* sell)\b|ಸ್ಥಳ ಪ್ರವೇಶ|ಯಾವ ಬೆಳೆ|ಯಾವ ಮಂಡಿ|ಎಷ್ಟು ಕೆಜಿ|स्थान की अनुमति|कौन सी फसल|कौन सी मंडी|ఎంత పరిమాణం/i
    .test(message);
}

function isEntityClarificationPrompt(message) {
  return /\b(which|what)\s+(?:crop|mandi|market)\b|ಯಾವ ಬೆಳೆ|ಯಾವ ಮಂಡಿ|कौन सी फसल|कौन सी मंडी|ఏ పంట|ఏ మండి/i
    .test(message);
}

function isContextualFollowUp(message) {
  if (/^(?:how|what) about you\b/i.test(message.trim())) return false;
  return /^(?:and\b|also\b|what about\b|how about\b|same for\b|why\b|how so\b|what does that\b|what is that\b|can you explain\b|tell me more\b|ಅದರ ಬಗ್ಗೆ|ಮತ್ತೆ|और\b|इसके बारे में|అదే|దాని గురించి)/i
    .test(message.trim());
}

function isQuantityClarification(message) {
  return /\b(quantity|kilograms?|how many|in kg)\b|ಪ್ರಮಾಣ|ಕೆಜಿ|मात्रा|किलो|పరిమాణం|కిలో/i.test(message);
}

function parseQuantityReply(message) {
  const match = message.trim().match(/^(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilograms?)?$/i);
  if (!match) return null;
  const quantity = Number(match[1]);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
}

function getForecastState(requestedMandi) {
  return requestedMandi?.state || 'Karnataka';
}

function getLocationConfirmation(message, history) {
  const lastMessage = sanitizeAssistantHistory(history).slice(-1)[0];
  if (lastMessage?.role !== 'assistant') return null;
  const lastAssistantMessage = lastMessage.content;
  if (!/\b(location|permission|allow|enable)\b|ಸ್ಥಳ|ಅನುಮತಿ|स्थान|अनुमति|లొకేషన్|అనుమతి/i
    .test(lastAssistantMessage)) return null;

  const normalized = message.trim().toLowerCase();
  if (/^(yes|yes please|yeah|yep|sure|okay|ok|allow|enable|go ahead|done|granted|enabled it|i enabled it|location is on|ಹೌದು|ಸರಿ|हाँ|ठीक है|అవును|సరే)[.! ]*$/i
    .test(normalized)) return 'accepted';
  if (/^(no|nope|no thanks|don't|do not|not now|cancel|ಬೇಡ|ಇಲ್ಲ|नहीं|मत|వద్దు|కాదు)[.! ]*$/i
    .test(normalized)) return 'declined';
  return null;
}

function findRecentCropMention(history, crops, aliasesByCrop = cropNameAliases) {
  const safeHistory = sanitizeAssistantHistory(history);
  const userMessages = safeHistory
    .filter((item) => item.role === 'user')
    .map((item) => item.content)
    .reverse();

  for (const message of userMessages) {
    const normalizedMessage = ` ${message.toLowerCase().normalize('NFC')
      .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ').trim()} `;
    for (const crop of crops) {
      const normalizedCrop = crop.name.toLowerCase().normalize('NFC')
        .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ').trim();
      const aliases = (aliasesByCrop[normalizedCrop] || []).map((alias) => alias.toLowerCase().normalize('NFC')
        .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim());
      if ([normalizedCrop, ...aliases].some((term) => normalizedMessage.includes(` ${term} `))) {
        return crop;
      }
    }
  }
  return null;
}

function resolveAssistantFollowUp(message, history, hasEntityReply = false) {
  const safeHistory = sanitizeAssistantHistory(history);
  const lastMessage = safeHistory[safeHistory.length - 1];
  if (lastMessage?.role !== 'assistant') {
    return { message, quantityKg: null, isFollowUp: false };
  }

  const clarificationPrompt = isClarificationPrompt(lastMessage.content);
  const entityFollowUp = hasEntityReply && isEntityClarificationPrompt(lastMessage.content)
    && !isAssistantTaskRequest(message);
  if (!clarificationPrompt && !isContextualFollowUp(message) && !entityFollowUp) {
    return { message, quantityKg: null, isFollowUp: false };
  }

  const userHistory = safeHistory.slice(0, -1);
  let intentIndex = -1;
  for (let index = 0; index < userHistory.length; index++) {
    if (userHistory[index].role === 'user' && isAssistantTaskRequest(userHistory[index].content)) {
      intentIndex = index;
    }
  }
  if (intentIndex < 0 && clarificationPrompt) {
    for (let index = userHistory.length - 1; index >= 0; index--) {
      if (userHistory[index].role === 'user' && userHistory[index].content.length > 2) {
        intentIndex = index;
        break;
      }
    }
  }
  if (intentIndex < 0) return { message, quantityKg: null, isFollowUp: false };

  const previousUserMessages = userHistory
    .slice(intentIndex)
    .filter((item) => item.role === 'user')
    .map((item) => item.content);
  const quantityKg = isProfitIntent(previousUserMessages.join(' '))
    && isQuantityClarification(lastMessage.content)
    ? parseQuantityReply(message)
    : null;
  return {
    message: [...previousUserMessages, message].join(' '),
    quantityKg,
    isFollowUp: clarificationPrompt || isContextualFollowUp(message) || entityFollowUp,
  };
}

function resolveProfitFollowUp(message, history) {
  return resolveAssistantFollowUp(message, history);
}

module.exports = {
  cropNameAliases,
  sanitizeAssistantHistory,
  parseQuantityReply,
  getForecastState,
  getLocationConfirmation,
  findRecentCropMention,
  isClarificationPrompt,
  resolveAssistantFollowUp,
  resolveProfitFollowUp,
};