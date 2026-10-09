const axios = require('axios');

const languageNames = {
  en: 'English',
  kn: 'Kannada',
  hi: 'Hindi',
  te: 'Telugu',
};

function fallbackReply(message, language) {
  const lowerMessage = message.toLowerCase();
  const isPriceQuestion = lowerMessage.includes('price') || lowerMessage.includes('ಬೆಲೆ') || lowerMessage.includes('कीमत') || lowerMessage.includes('ధర');
  const isProfitQuestion = lowerMessage.includes('profit') || lowerMessage.includes('ಲಾಭ') || lowerMessage.includes('लाभ') || lowerMessage.includes('లాభ');

  if (language === 'kn') {
    if (isPriceQuestion) return 'ಬೆಳೆ ಮತ್ತು ಮಂಡಿಯನ್ನು ಆಯ್ಕೆ ಮಾಡಿ. ಹೋಮ್ ಪರದೆಯಲ್ಲಿ ಇಂದಿನ ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗಳನ್ನು ಹೋಲಿಸಬಹುದು.';
    if (isProfitQuestion) return 'ಲಾಭ ಲೆಕ್ಕಿಸಲು ಬೆಳೆ, ಮಂಡಿ ಮತ್ತು ಕಿಲೋಗ್ರಾಂ ಪ್ರಮಾಣವನ್ನು ಆಯ್ಕೆ ಮಾಡಿ.';
    return 'ಬೆಳೆಗಳು, ಮಂಡಿ ಬೆಲೆಗಳು ಮತ್ತು ಲಾಭದ ಬಗ್ಗೆ ನಾನು ಸಹಾಯ ಮಾಡಬಹುದು.';
  }
  if (language === 'hi') {
    if (isPriceQuestion) return 'फसल और मंडी चुनें। होम स्क्रीन पर आज की मंडी कीमतों की तुलना कर सकते हैं।';
    if (isProfitQuestion) return 'लाभ की गणना करने के लिए फसल, मंडी और किलोग्राम मात्रा चुनें।';
    return 'मैं फसल, मंडी कीमत और लाभ से जुड़े सवालों में मदद कर सकता हूँ।';
  }
  if (language === 'te') {
    if (isPriceQuestion) return 'పంట మరియు మండిని ఎంచుకోండి. హోమ్ స్క్రీన్‌లో నేటి మార్కెట్ ధరలను పోల్చవచ్చు.';
    if (isProfitQuestion) return 'లాభాన్ని లెక్కించడానికి పంట, మండి మరియు కిలోల పరిమాణాన్ని ఎంచుకోండి.';
    return 'పంటలు, మండి ధరలు మరియు లాభాల గురించి నేను సహాయం చేయగలను.';
  }
  if (isPriceQuestion) return 'Select a crop and mandi to compare today\'s market prices on the Home screen.';
  if (isProfitQuestion) return 'Choose a crop, mandi, and quantity in kilograms to calculate estimated profit.';
  return 'I can help with crops, mandi prices, and profit calculations. Ask me a specific question.';
}

async function askAssistant(req, res) {
  try {
    const { message, language = 'en', history = [] } = req.body;
    const trimmedMessage = typeof message === 'string' ? message.trim() : '';
    if (!trimmedMessage) return res.status(400).json({ error: 'message is required.' });
    if (!languageNames[language]) return res.status(400).json({ error: 'Unsupported language.' });

    if (!process.env.AI_API_KEY) {
      return res.json({ reply: fallbackReply(trimmedMessage, language), source: 'local' });
    }

    const safeHistory = Array.isArray(history)
      ? history.filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string').slice(-8)
      : [];
    const response = await axios.post(
      process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions',
      {
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: `You are SmartRaitha, a practical agricultural assistant. Answer questions about crops, mandi markets, prices, transport, and farm profit. Reply only in ${languageNames[language]}. Be concise, explain uncertainty, and never invent live prices.`,
          },
          ...safeHistory,
          { role: 'user', content: trimmedMessage },
        ],
      },
      { headers: { Authorization: `Bearer ${process.env.AI_API_KEY}` } },
    );

    const reply = response.data?.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error('AI provider returned an empty response.');
    res.json({ reply, source: 'ai' });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(502).json({ error: 'The AI assistant is temporarily unavailable. Please try again.' });
  }
}

module.exports = { askAssistant };
