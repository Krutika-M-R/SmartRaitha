function normalizeQuestion(value) {
  return value.toLowerCase().normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

const helpTopics = [
  {
    match: /\b(source|agmarknet|where .* prices? .* from|price data)\b/i,
    replies: {
      en: 'SmartRaitha shows mandi prices reported through Agmarknet. It uses the latest available report and saved price snapshots, so a displayed price may not be a live quote. Check the report date before deciding to sell.',
      kn: 'SmartRaitha Agmarknet ವರದಿ ಮಾಡಿದ ಮಂಡಿ ಬೆಲೆಗಳನ್ನು ತೋರಿಸುತ್ತದೆ. ಇತ್ತೀಚಿನ ಲಭ್ಯ ವರದಿ ಮತ್ತು ಉಳಿಸಿದ ಬೆಲೆ ದಾಖಲೆಗಳನ್ನು ಬಳಸುವುದರಿಂದ, ತೋರಿಸಿದ ಬೆಲೆ ನೇರ ಲೈವ್ ದರವಾಗಿರದೇ ಇರಬಹುದು. ಮಾರಾಟದ ನಿರ್ಧಾರಕ್ಕೂ ಮೊದಲು ವರದಿ ದಿನಾಂಕ ಪರಿಶೀಲಿಸಿ.',
      hi: 'SmartRaitha, Agmarknet द्वारा रिपोर्ट किए गए मंडी भाव दिखाता है। इसमें नवीनतम उपलब्ध रिपोर्ट और सहेजे गए भाव शामिल हो सकते हैं, इसलिए दिखाया गया भाव लाइव भाव होना जरूरी नहीं है। बेचने से पहले रिपोर्ट की तारीख देखें।',
      te: 'SmartRaitha, Agmarknet నివేదించిన మండి ధరలను చూపిస్తుంది. తాజా అందుబాటులో ఉన్న నివేదికలు, సేవ్ చేసిన ధరలను ఉపయోగిస్తుంది; అందువల్ల చూపిన ధర లైవ్ ధర కాకపోవచ్చు. అమ్మే ముందు నివేదిక తేదీని చూడండి.',
    },
  },
  {
    match: /\b(price|prices|mandi|market)\b.*\b(check|find|see|view|compare|open|look|show|how|where)\b|\b(how|where)\b.*\b(price|prices|mandi|market)\b/i,
    replies: {
      en: 'To compare mandi prices, go to Home, choose a crop, then tap Compare Markets. The Markets screen shows the available reports and their dates; availability depends on the latest Agmarknet data and saved reports.',
      kn: 'ಮಂಡಿ ಬೆಲೆಗಳನ್ನು ಹೋಲಿಸಲು Home ತೆರೆಯಿರಿ, ಬೆಳೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ, ನಂತರ Compare Markets ಒತ್ತಿರಿ. Markets ಪರದೆಯಲ್ಲಿ ಲಭ್ಯ ವರದಿಗಳು ಮತ್ತು ದಿನಾಂಕಗಳು ಕಾಣುತ್ತವೆ; ಲಭ್ಯತೆ ಇತ್ತೀಚಿನ Agmarknet ಡೇಟಾ ಮತ್ತು ಉಳಿಸಿದ ವರದಿಗಳ ಮೇಲೆ ಅವಲಂಬಿತವಾಗಿದೆ.',
      hi: 'मंडी भावों की तुलना करने के लिए Home खोलें, फसल चुनें और Compare Markets दबाएँ। Markets स्क्रीन उपलब्ध रिपोर्ट और उनकी तारीखें दिखाती है; उपलब्धता नवीनतम Agmarknet डेटा और सहेजी गई रिपोर्टों पर निर्भर करती है।',
      te: 'మండి ధరలను పోల్చడానికి Home తెరిచి, పంటను ఎంచుకుని, Compare Markets నొక్కండి. Markets స్క్రీన్ అందుబాటులో ఉన్న నివేదికలు, వాటి తేదీలను చూపిస్తుంది; తాజా Agmarknet డేటా, సేవ్ చేసిన నివేదికలపై లభ్యత ఆధారపడి ఉంటుంది.',
    },
  },
  {
    priority: true,
    match: /\b(how|where)\b.*\b(find|see|view|open)\b.*\b(recommend|recommended|best|nearest)\b.*\b(mandi|market)\b|\b(how|where)\b.*\b(recommend|recommended|best|nearest)\b.*\b(mandi|market)\b/i,
    replies: {
      en: 'Choose a crop on the Home screen to see its recommended market. Recommendations use available mandi price reports and your location when available; they are estimates, not a guarantee of the best selling outcome.',
      kn: 'ಶಿಫಾರಸು ಮಾಡಿದ ಮಾರುಕಟ್ಟೆ ನೋಡಲು Home ಪರದೆಯಲ್ಲಿ ಬೆಳೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ. ಶಿಫಾರಸುಗಳು ಲಭ್ಯ ಮಂಡಿ ಬೆಲೆ ವರದಿಗಳು ಮತ್ತು ಲಭ್ಯವಿದ್ದರೆ ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ಬಳಸುತ್ತವೆ; ಅವು ಅಂದಾಜು ಮಾತ್ರ, ಉತ್ತಮ ಮಾರಾಟದ ಖಾತರಿಯಲ್ಲ.',
      hi: 'अनुशंसित बाज़ार देखने के लिए Home स्क्रीन पर फसल चुनें। सुझाव उपलब्ध मंडी भावों और, उपलब्ध होने पर, आपके स्थान पर आधारित होते हैं; यह अनुमान है, सर्वोत्तम बिक्री की गारंटी नहीं।',
      te: 'సిఫార్సు చేసిన మార్కెట్ చూడటానికి Home స్క్రీన్‌లో పంటను ఎంచుకోండి. అందుబాటులో ఉన్న మండి ధరలు, మీ స్థానం లభ్యమైతే దాని ఆధారంగా సూచన వస్తుంది; ఇది అంచనా మాత్రమే, ఉత్తమ అమ్మకానికి హామీ కాదు.',
    },
  },
  {
    match: /\b(profit|earning|earnings|income|revenue)\b.*\b(calculate|estimate|check|find|how|where)\b|\b(how|where)\b.*\b(calculate|estimate)\b.*\b(profit|earning|income)\b|\bprofit calculator\b/i,
    replies: {
      en: 'To estimate profit, choose a crop on Home and tap Calculate Profit. Select a mandi and enter the quantity in kilograms. The estimate uses available reported prices and transportation costs; actual costs and sale prices may differ.',
      kn: 'ಲಾಭ ಅಂದಾಜಿಸಲು Home ನಲ್ಲಿ ಬೆಳೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ Calculate Profit ಒತ್ತಿರಿ. ಮಂಡಿ ಆಯ್ಕೆಮಾಡಿ, ಕಿಲೋಗ್ರಾಂಗಳಲ್ಲಿ ಪ್ರಮಾಣ ನಮೂದಿಸಿ. ಲಭ್ಯ ಬೆಲೆ ವರದಿ ಮತ್ತು ಸಾರಿಗೆ ವೆಚ್ಚ ಬಳಸಿ ಅಂದಾಜು ಮಾಡಲಾಗುತ್ತದೆ; ನಿಜವಾದ ವೆಚ್ಚ ಮತ್ತು ಮಾರಾಟ ಬೆಲೆ ಬದಲಾಗಬಹುದು.',
      hi: 'लाभ का अनुमान लगाने के लिए Home पर फसल चुनें और Calculate Profit दबाएँ। मंडी चुनकर मात्रा किलोग्राम में डालें। अनुमान उपलब्ध भाव रिपोर्ट और परिवहन लागत पर आधारित है; वास्तविक लागत और बिक्री भाव अलग हो सकते हैं।',
      te: 'లాభాన్ని అంచనా వేయడానికి Homeలో పంటను ఎంచుకుని Calculate Profit నొక్కండి. మండి ఎంచుకుని కిలోగ్రాముల్లో పరిమాణం నమోదు చేయండి. అందుబాటులో ఉన్న ధరల నివేదికలు, రవాణా ఖర్చులతో అంచనా వేస్తుంది; నిజమైన ఖర్చు, అమ్మకపు ధర మారవచ్చు.',
    },
  },
  {
    match: /\b(weather|rain|forecast|humidity|wind|location|gps)\b|\b(allow|enable|turn on)\b.*\b(location|permission)\b/i,
    replies: {
      en: 'Weather and seasonal crop guidance are on the Home screen under Farm Help. Allow location access when prompted to get guidance for your area. The app provides current and seven-day weather information, not a long-range seasonal weather forecast.',
      kn: 'ಹವಾಮಾನ ಮತ್ತು ಋತುಮಾನ ಬೆಳೆ ಮಾರ್ಗದರ್ಶನ Home ಪರದೆಯ Farm Help ವಿಭಾಗದಲ್ಲಿದೆ. ನಿಮ್ಮ ಪ್ರದೇಶದ ಮಾರ್ಗದರ್ಶನ ಪಡೆಯಲು ಕೇಳಿದಾಗ ಸ್ಥಳ ಪ್ರವೇಶವನ್ನು ಅನುಮತಿಸಿ. ಆಪ್ ಪ್ರಸ್ತುತ ಮತ್ತು ಏಳು ದಿನಗಳ ಹವಾಮಾನವನ್ನು ನೀಡುತ್ತದೆ; ದೀರ್ಘಾವಧಿಯ ಋತುಮಾನ ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ ನೀಡುವುದಿಲ್ಲ.',
      hi: 'मौसम और मौसमी फसल मार्गदर्शन Home स्क्रीन के Farm Help भाग में है। अपने क्षेत्र की जानकारी पाने के लिए पूछे जाने पर स्थान की अनुमति दें। ऐप वर्तमान और सात दिनों की मौसम जानकारी देता है, लंबी अवधि का मौसमी मौसम पूर्वानुमान नहीं।',
      te: 'వాతావరణం, సీజనల్ పంట మార్గదర్శకం Home స్క్రీన్‌లోని Farm Help విభాగంలో ఉన్నాయి. మీ ప్రాంతం కోసం సమాచారం పొందడానికి అడిగినప్పుడు లొకేషన్ అనుమతించండి. యాప్ ప్రస్తుత, ఏడు రోజుల వాతావరణాన్ని ఇస్తుంది; దీర్ఘకాల సీజనల్ వాతావరణ అంచనాను కాదు.',
    },
  },
  {
    match: /\b(crop planner|seasonal|season|sowing|planting|plan crops|crop plan)\b/i,
    replies: {
      en: 'Open Home and tap Seasonal Planning to open Crop Planner. It suggests crops using bundled crop profiles, your location, and climate normals. Treat the result as guidance and confirm local conditions with an agriculture expert.',
      kn: 'Crop Planner ತೆರೆಯಲು Home ನಲ್ಲಿ Seasonal Planning ಒತ್ತಿರಿ. ಇದು ಒಳಗೊಂಡಿರುವ ಬೆಳೆ ಪ್ರೊಫೈಲ್‌ಗಳು, ನಿಮ್ಮ ಸ್ಥಳ ಮತ್ತು ಹವಾಮಾನ ಸಾಮಾನ್ಯ ಮಾದರಿಗಳ ಆಧಾರದಲ್ಲಿ ಬೆಳೆ ಸೂಚಿಸುತ್ತದೆ. ಇದನ್ನು ಮಾರ್ಗದರ್ಶನವಾಗಿ ಬಳಸಿ ಮತ್ತು ಸ್ಥಳೀಯ ಕೃಷಿ ತಜ್ಞರೊಂದಿಗೆ ಪರಿಶೀಲಿಸಿ.',
      hi: 'Crop Planner खोलने के लिए Home पर Seasonal Planning दबाएँ। यह शामिल फसल प्रोफ़ाइल, आपके स्थान और जलवायु सामान्यताओं के आधार पर सुझाव देता है। इसे मार्गदर्शन मानें और स्थानीय कृषि विशेषज्ञ से पुष्टि करें।',
      te: 'Crop Planner తెరవడానికి Homeలో Seasonal Planning నొక్కండి. ఇందులోని పంట ప్రొఫైళ్లు, మీ స్థానం, వాతావరణ సాధారణాల ఆధారంగా పంటలను సూచిస్తుంది. దీన్ని మార్గదర్శకంగా తీసుకుని స్థానిక వ్యవసాయ నిపుణుడితో నిర్ధారించండి.',
    },
  },
  {
    prediction: true,
    match: /\b(prediction|predict|future price|two day|2 day|tomorrow price)\b/i,
    replies: {
      en: 'Open Markets for a crop to view its available two-day price prediction. Predictions require enough recent Agmarknet reports and are estimates, not guaranteed future prices.',
      kn: 'ಬೆಳೆಯ Markets ಪರದೆಯನ್ನು ತೆರೆಯಿರಿ; ಲಭ್ಯವಿದ್ದರೆ ಎರಡು ದಿನಗಳ ಬೆಲೆ ಮುನ್ಸೂಚನೆ ಕಾಣುತ್ತದೆ. ಇದಕ್ಕೆ ಸಾಕಷ್ಟು ಇತ್ತೀಚಿನ Agmarknet ವರದಿಗಳು ಅಗತ್ಯ; ಮುನ್ಸೂಚನೆ ಅಂದಾಜು ಮಾತ್ರ, ಖಚಿತ ಭವಿಷ್ಯದ ಬೆಲೆಯಲ್ಲ.',
      hi: 'किसी फसल के लिए दो-दिन की उपलब्ध कीमत भविष्यवाणी देखने हेतु Markets खोलें। इसके लिए पर्याप्त हालिया Agmarknet रिपोर्ट चाहिए; यह अनुमान है, भविष्य की कीमत की गारंटी नहीं।',
      te: 'పంటకు అందుబాటులో ఉన్న రెండు రోజుల ధర అంచనాను చూడటానికి Markets తెరవండి. దీనికి తగినంత తాజా Agmarknet నివేదికలు అవసరం; ఇది అంచనా మాత్రమే, భవిష్యత్ ధరకు హామీ కాదు.',
    },
  },
  {
    match: /\b(profile|account|settings|language|translate|log ?in|sign ?up|password|log ?out)\b/i,
    replies: {
      en: 'Open the Profile tab to update your profile, change the app language, or log out. Use the sign-in screen’s Forgot Password option if you need to reset your password.',
      kn: 'ಪ್ರೊಫೈಲ್ ಬದಲಾಯಿಸಲು, ಆಪ್ ಭಾಷೆ ಬದಲಿಸಲು ಅಥವಾ ಲಾಗ್ ಔಟ್ ಮಾಡಲು Profile ಟ್ಯಾಬ್ ತೆರೆಯಿರಿ. ಪಾಸ್‌ವರ್ಡ್ ಮರುಹೊಂದಿಸಲು ಸೈನ್-ಇನ್ ಪರದೆಯ Forgot Password ಆಯ್ಕೆ ಬಳಸಿ.',
      hi: 'प्रोफ़ाइल बदलने, ऐप की भाषा बदलने या लॉग आउट करने के लिए Profile टैब खोलें। पासवर्ड रीसेट करने के लिए साइन-इन स्क्रीन पर Forgot Password चुनें।',
      te: 'ప్రొఫైల్ మార్చడానికి, యాప్ భాషను మార్చడానికి లేదా లాగ్ అవుట్ చేయడానికి Profile ట్యాబ్ తెరవండి. పాస్‌వర్డ్ రీసెట్ చేయడానికి సైన్-ఇన్ స్క్రీన్‌లో Forgot Password ఎంచుకోండి.',
    },
  },
  {
    match: /\b(voice|speak|listen|audio|read aloud|hear)\b/i,
    replies: {
      en: 'Tap Speak under an assistant reply to hear it read aloud. LittleLeaf uses your selected app language for speech when that voice is available on your device.',
      kn: 'ಸಹಾಯಕನ ಉತ್ತರದ ಕೆಳಗಿನ Speak ಒತ್ತಿ ಅದನ್ನು ಕೇಳಿ. ನಿಮ್ಮ ಸಾಧನದಲ್ಲಿ ಆ ಧ್ವನಿ ಲಭ್ಯವಿದ್ದರೆ LittleLeaf ಆಯ್ಕೆ ಮಾಡಿದ ಆಪ್ ಭಾಷೆಯಲ್ಲಿ ಉತ್ತರವನ್ನು ಓದುತ್ತದೆ.',
      hi: 'किसी उत्तर के नीचे Speak दबाकर उसे सुनें। आपके डिवाइस पर आवाज़ उपलब्ध होने पर LittleLeaf चयनित ऐप भाषा में उत्तर पढ़ेगा।',
      te: 'సహాయకుడి సమాధానం కింద Speak నొక్కి వినండి. మీ పరికరంలో ఆ వాయిస్ అందుబాటులో ఉంటే LittleLeaf మీరు ఎంచుకున్న యాప్ భాషలో చదువుతుంది.',
    },
  },
  {
    match: /\b(offline|without internet|no internet|network|not working|error|issue|problem)\b/i,
    replies: {
      en: 'Some saved mandi reports may still be available when a live price lookup is unavailable, but weather, account, and other live features need a network connection. Check your connection and try again; location-based features also need location permission.',
      kn: 'ಲೈವ್ ಬೆಲೆ ಹುಡುಕಾಟ ಲಭ್ಯವಿಲ್ಲದಿದ್ದರೂ ಕೆಲವು ಉಳಿಸಿದ ಮಂಡಿ ವರದಿಗಳು ಲಭ್ಯವಾಗಬಹುದು; ಆದರೆ ಹವಾಮಾನ, ಖಾತೆ ಮತ್ತು ಇತರ ಲೈವ್ ವೈಶಿಷ್ಟ್ಯಗಳಿಗೆ ಇಂಟರ್ನೆಟ್ ಅಗತ್ಯ. ಸಂಪರ್ಕ ಪರಿಶೀಲಿಸಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ; ಸ್ಥಳ ಆಧಾರಿತ ವೈಶಿಷ್ಟ್ಯಗಳಿಗೆ ಸ್ಥಳ ಅನುಮತಿಯೂ ಬೇಕು.',
      hi: 'लाइव भाव उपलब्ध न होने पर भी कुछ सहेजी गई मंडी रिपोर्ट मिल सकती हैं, लेकिन मौसम, खाता और अन्य लाइव सुविधाओं के लिए इंटरनेट चाहिए। कनेक्शन जाँचकर फिर कोशिश करें; स्थान-आधारित सुविधाओं के लिए स्थान अनुमति भी चाहिए।',
      te: 'లైవ్ ధర అందుబాటులో లేకపోయినా కొన్ని సేవ్ చేసిన మండి నివేదికలు కనిపించవచ్చు; వాతావరణం, ఖాతా, ఇతర లైవ్ ఫీచర్లకు ఇంటర్నెట్ అవసరం. కనెక్షన్ చూసి మళ్లీ ప్రయత్నించండి; స్థానం ఆధారిత ఫీచర్లకు లొకేషన్ అనుమతి కూడా కావాలి.',
    },
  },
];

const overviewReplies = {
  en: 'SmartRaitha helps farmers compare reported mandi prices, view market recommendations, estimate profit and transport costs, check local weather, use seasonal crop planning, and see available two-day price predictions. LittleLeaf can explain how to use these features. Results depend on available data and are estimates where indicated.',
  kn: 'SmartRaitha ರೈತರಿಗೆ ಮಂಡಿ ಬೆಲೆ ಹೋಲಿಕೆ, ಮಾರುಕಟ್ಟೆ ಶಿಫಾರಸು, ಲಾಭ ಮತ್ತು ಸಾರಿಗೆ ವೆಚ್ಚ ಅಂದಾಜು, ಸ್ಥಳೀಯ ಹವಾಮಾನ, ಋತುಮಾನ ಬೆಳೆ ಯೋಜನೆ ಮತ್ತು ಲಭ್ಯವಿರುವ ಎರಡು ದಿನಗಳ ಬೆಲೆ ಮುನ್ಸೂಚನೆಗಳನ್ನು ನೀಡುತ್ತದೆ. ಈ ವೈಶಿಷ್ಟ್ಯಗಳನ್ನು ಹೇಗೆ ಬಳಸುವುದು ಎಂದು LittleLeaf ವಿವರಿಸುತ್ತದೆ. ಫಲಿತಾಂಶಗಳು ಲಭ್ಯ ಡೇಟಾದ ಮೇಲೆ ಅವಲಂಬಿತವಾಗಿವೆ; ಸೂಚಿಸಿದಲ್ಲಿ ಅವು ಅಂದಾಜುಗಳು.',
  hi: 'SmartRaitha किसानों को मंडी भावों की तुलना, बाज़ार सुझाव, लाभ और परिवहन लागत का अनुमान, स्थानीय मौसम, मौसमी फसल योजना और उपलब्ध दो-दिन की कीमत भविष्यवाणी देता है। LittleLeaf इन सुविधाओं का उपयोग समझा सकता है। परिणाम उपलब्ध डेटा पर निर्भर हैं और जहाँ बताया गया है वहाँ अनुमान हैं।',
  te: 'SmartRaitha రైతులకు మండి ధరల పోలిక, మార్కెట్ సూచనలు, లాభం మరియు రవాణా ఖర్చుల అంచనా, స్థానిక వాతావరణం, సీజనల్ పంట ప్రణాళిక, అందుబాటులో ఉన్న రెండు రోజుల ధర అంచనాలను అందిస్తుంది. ఈ ఫీచర్లను ఎలా ఉపయోగించాలో LittleLeaf వివరిస్తుంది. ఫలితాలు అందుబాటులో ఉన్న డేటాపై ఆధారపడతాయి; పేర్కొన్నవి అంచనాలు.',
};

const fallbackReplies = {
  en: 'I can help you use SmartRaitha. The app includes mandi price comparisons, market recommendations, profit estimates, weather and seasonal crop guidance, two-day price predictions, profile and language settings, and spoken replies. Ask about a feature and I’ll explain where to find it.',
  kn: 'SmartRaitha ಬಳಸಲು ನಾನು ಸಹಾಯ ಮಾಡಬಹುದು. ಆಪ್‌ನಲ್ಲಿ ಮಂಡಿ ಬೆಲೆ ಹೋಲಿಕೆ, ಮಾರುಕಟ್ಟೆ ಶಿಫಾರಸು, ಲಾಭ ಅಂದಾಜು, ಹವಾಮಾನ ಮತ್ತು ಋತುಮಾನ ಬೆಳೆ ಮಾರ್ಗದರ್ಶನ, ಎರಡು ದಿನಗಳ ಬೆಲೆ ಮುನ್ಸೂಚನೆ, ಪ್ರೊಫೈಲ್ ಮತ್ತು ಭಾಷಾ ಸೆಟ್ಟಿಂಗ್‌ಗಳು, ಧ್ವನಿ ಉತ್ತರಗಳಿವೆ. ವೈಶಿಷ್ಟ್ಯದ ಬಗ್ಗೆ ಕೇಳಿ; ಅದನ್ನು ಎಲ್ಲಿ ಕಾಣಬಹುದು ಎಂದು ತಿಳಿಸುತ್ತೇನೆ.',
  hi: 'मैं SmartRaitha इस्तेमाल करने में मदद कर सकता हूँ। ऐप में मंडी भाव तुलना, बाज़ार सुझाव, लाभ अनुमान, मौसम व मौसमी फसल मार्गदर्शन, दो-दिन की कीमत भविष्यवाणी, प्रोफ़ाइल व भाषा सेटिंग और बोले गए जवाब हैं। किसी सुविधा के बारे में पूछें, मैं बताऊँगा कि उसे कहाँ पाएँ।',
  te: 'SmartRaitha ఉపయోగించడంలో నేను సహాయం చేస్తాను. యాప్‌లో మండి ధరల పోలిక, మార్కెట్ సూచనలు, లాభ అంచనా, వాతావరణం మరియు సీజనల్ పంట మార్గదర్శకం, రెండు రోజుల ధర అంచనా, ప్రొఫైల్ మరియు భాషా సెట్టింగ్‌లు, వాయిస్ సమాధానాలు ఉన్నాయి. ఫీచర్ గురించి అడగండి; అది ఎక్కడుందో చెబుతాను.',
};

function isMandiRecommendationQuestion(message) {
  const normalized = normalizeQuestion(message);
  return /\b(best|good|highest|most profitable|recommended|recommend|nearest|closest)\b.*\b(mandi|market)\b/i.test(normalized)
    || /\b(mandi|market)\b.*\b(best|good|highest|profitable|recommended|recommend|nearest|closest)\b/i.test(normalized)
    || /ಉತ್ತಮ.*ಮಂಡಿ|ಮಂಡಿ.*ಉತ್ತಮ|ಹತ್ತಿರದ.*ಮಂಡಿ|ಮಂಡಿ.*ಹತ್ತಿರದ|सबसे अच्छी.*मंडी|मंडी.*सबसे अच्छी|पास की.*मंडी|मंडी.*पास की|ఉత్తమ.*మండి|మండి.*ఉత్తమ|దగ్గర.*మండి|మండి.*దగ్గర/i
      .test(normalized);
}

function isPricePredictionQuestion(message) {
  const normalized = normalizeQuestion(message);
  if (/\b(weather|rain|temperature|humidity|wind)\b|ಹವಾಮಾನ|ಮಳೆ|ತಾಪಮಾನ|ಮೌಸಮ|बारिश|मौसम|तापमान|వాతావరణం|వర్షం|ఉష్ణోగ్రత/i
    .test(normalized)) return false;
  const hasPredictionIntent = /\b(predict(?:ion|ed)?|forecast(?:ing)?|future price|tomorrow|next (?:two|2) days?|(?:after|in) (?:the )?(?:next )?(?:two|2) days?|price in (?:two|2) days?|two day)\b/i
    .test(normalized)
    || /ಮುನ್ಸೂಚನೆ|ಭವಿಷ್ಯ|ಎರಡು ದಿನ|2 ದಿನ|कल|पूर्वानुमान|भविष्य|दो दिन|2 दिन|రేపు|అంచనా|రెండు రోజులు|2 రోజులు/i
      .test(normalized);
  const hasPriceContext = /\b(price|prices|rate|rates|crop|commodity)\b|ಬೆಲೆ|ದರ|ಭಾವ|कीमत|भाव|ధర|రేటు/i.test(normalized);
  const explicitlyAsksToPredict = /\b(predict(?:ion|ed)?)\b|ಮುನ್ಸೂಚನೆ|ಭವಿಷ್ಯ|पूर्वानुमान|भविष्य|అంచనా/i.test(normalized);
  return hasPredictionIntent && (hasPriceContext || explicitlyAsksToPredict);
}

function getAppHelpReply(message, language) {
  const normalized = normalizeQuestion(message);
  const english = language === 'en';
  const asksOverview = /\b(what can (you|smartraitha|this app) do|what does .* app do|what is smartraitha|about (the )?app|app features|features of|how does .* app work|who are you|help me)\b/i.test(normalized);
  const appMentioned = /\b(app|smartraitha|littleleaf|screen|feature|profile|settings|account)\b/i.test(normalized);
  const asksHowTo = /\b(how|where|can i|do i|does the app|is there|show me)\b/i.test(normalized);

  if (asksOverview) return overviewReplies[language];
  if (isPricePredictionQuestion(message)) return null;

  const priorityHelp = helpTopics.find((topic) => topic.priority && topic.match.test(normalized));
  if (priorityHelp) return priorityHelp.replies[language];

  for (const topic of helpTopics) {
    if (!topic.priority && topic.match.test(normalized)) return topic.replies[language];
  }

  if (appMentioned && (asksHowTo || english || /\b(ಹೇಗೆ|ಎಲ್ಲಿ|ಆಪ್|ಅಪ್ಲಿಕೇಶನ್|कैसे|कहाँ|ऐप|ఎలా|ఎక్కడ|యాప్)\b/.test(normalized))) {
    return fallbackReplies[language];
  }

  return null;
}

module.exports = {
  getAppHelpReply,
  isMandiRecommendationQuestion,
  isPricePredictionQuestion,
};
