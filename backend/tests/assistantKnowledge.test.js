const assert = require('node:assert/strict');
const test = require('node:test');
const {
  getAppHelpReply,
  isMandiRecommendationQuestion,
  isPricePredictionQuestion,
} = require('../services/assistantKnowledgeService');

test('answers common app feature questions without an external AI provider', () => {
  const reply = getAppHelpReply('What can SmartRaitha do?', 'en');

  assert.match(reply, /mandi price/i);
  assert.match(reply, /profit/i);
  assert.match(reply, /weather/i);
  assert.match(reply, /two-day price predictions/i);
});

test('explains how to use app features in the selected language', () => {
  assert.match(getAppHelpReply('How do I calculate profit?', 'en'), /Calculate Profit/);
  assert.match(getAppHelpReply('Where can I change the language?', 'kn'), /Profile/);
  assert.match(getAppHelpReply('How do I check the weather?', 'hi'), /स्थान की अनुमति/);
  assert.match(getAppHelpReply('How do I hear the reply?', 'te'), /Speak/);
});

test('returns a helpful app-specific fallback for unrecognized app questions', () => {
  assert.match(getAppHelpReply('How do I export my data from SmartRaitha?', 'en'), /I can help you use SmartRaitha/);
});

test('does not claim to answer unrelated questions', () => {
  assert.equal(getAppHelpReply('What is the capital of France?', 'en'), null);
});

test('routes crop-specific best mandi questions to market recommendations', () => {
  for (const question of [
    'best mandi for green chilli',
    'tell me best mandi gor green chilli',
    'which market has the highest price for green chilli?',
    'best mandi near me to sell',
    'closest mandi to sell tomato',
    'ನನಗೆ ಹತ್ತಿರದ ಉತ್ತಮ ಮಂಡಿ ಯಾವುದು?',
  ]) {
    assert.equal(isMandiRecommendationQuestion(question), true);
    assert.equal(getAppHelpReply(question, 'en'), null);
  }
});

test('keeps app guidance for asking how to find a mandi recommendation', () => {
  assert.match(getAppHelpReply('How do I find the best mandi?', 'en'), /Home screen/);
});

test('routes crop price forecasts to the ML prediction path instead of generic help', () => {
  for (const question of [
    'predict green chilli price after 2 days',
    'forecast green chili price for the next two days',
    'what is the price in 2 days for green chilli?',
    'ಈರುಳ್ಳಿ ಬೆಲೆ ಎರಡು ದಿನದ ಮುನ್ಸೂಚನೆ',
  ]) {
    assert.equal(isPricePredictionQuestion(question), true);
    assert.equal(getAppHelpReply(question, 'en'), null);
  }
});
