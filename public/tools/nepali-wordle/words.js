/**
 * Nepali Wordle word lists
 * All words are exactly 5 Unicode characters (NFC).
 * ANSWERS: curated everyday / common words used as daily & practice solutions.
 * VALID: larger set of acceptable guesses (includes all ANSWERS).
 */
(function (global) {
  "use strict";

  // Curated answer words (common, recognizable Nepali)
  const ANSWERS = [
    "किताब", "स्कूल", "लेखाइ", "बोलाइ", "सुनाइ", "हेराइ", "हिडाइ", "दौडाइ", "पिउना", "हासाइ",
    "रोदाइ", "गानाइ", "नाचाइ", "खेलाइ", "आमाको", "भाईको", "रोपनी", "निसाफ", "अडिलो", "विमना",
    "लतलती", "जाईफल", "खसिया", "चराचर", "आरोहण", "कचौरा", "आभारी", "पटापट", "पाताल", "छाउरा",
    "सनासो", "तादात", "अगोचर", "एकोटा", "मालिस", "चिलाइ", "अदालत", "दोहली", "दलाली", "कोइलो",
    "कोरलो", "रोमिल", "विलीन", "निचोड", "चौबास", "विभाव", "कोइरी", "मनथली", "एकासी", "शालीन",
    "चिहाउ", "वितान", "चकारि", "धीमान", "थमौती", "सिसौट", "खगौतो", "बहाली", "पोसाउ", "विसाद",
    "घरकाज", "उपजोड", "पिलास", "नेपाल", "पोखरा", "चितवन", "बाँके", "रसुवा", "गोरखा", "लमजुङ",
    "तनहुँ", "पर्वत", "पर्सा", "धनुषा", "धादिङ", "दोलखा", "खोटाङ", "रौतहट", "मायात", "मनमन",
    "सुताइ", "हिडाई", "हेराई", "सुनाई", "खेलाइ", "हासाइ", "रोदाइ", "नाचाइ", "गानाई", "दौडाइ"
  ];

  // Extra valid guesses
  const EXTRA_VALID = [
    "किताब", "स्कूल", "लेखाइ", "बोलाइ", "सुनाइ", "हेराइ", "हिडाइ", "दौडाइ", "पिउना", "हासाइ",
    "रोदाइ", "गानाइ", "नाचाइ", "खेलाइ", "आमाको", "भाईको", "रोपनी", "निसाफ", "अडिलो", "विमना",
    "लतलती", "जाईफल", "खसिया", "चराचर", "आरोहण", "कचौरा", "आभारी", "पटापट", "पाताल", "छाउरा",
    "सनासो", "तादात", "अगोचर", "एकोटा", "मालिस", "चिलाइ", "अदालत", "दोहली", "दलाली", "कोइलो",
    "कोरलो", "रोमिल", "विलीन", "निचोड", "चौबास", "विभाव", "कोइरी", "मनथली", "एकासी", "शालीन",
    "चिहाउ", "वितान", "चकारि", "धीमान", "थमौती", "सिसौट", "खगौतो", "बहाली", "पोसाउ", "विसाद",
    "घरकाज", "उपजोड", "पिलास", "नेपाल", "पोखरा", "चितवन", "बाँके", "रसुवा", "गोरखा", "लमजुङ",
    "तनहुँ", "पर्वत", "पर्सा", "धनुषा", "धादिङ", "दोलखा", "खोटाङ", "रौतहट", "मायात", "मनमन",
    "सुताइ", "हिडाई", "हेराई", "सुनाई", "खेलाइ", "हासाइ", "रोदाइ", "नाचाइ", "गानाई", "दौडाइ"
  ];

  function normalize(w) {
    return (w || "").normalize("NFC").trim();
  }

  const answerSet = new Set();
  const validSet = new Set();

  ANSWERS.forEach(function (w) {
    const n = normalize(w);
    if (n.length === 5) {
      answerSet.add(n);
      validSet.add(n);
    }
  });

  EXTRA_VALID.forEach(function (w) {
    const n = normalize(w);
    if (n.length === 5) validSet.add(n);
  });

  const ANSWER_LIST = Array.from(answerSet);
  const VALID_LIST = Array.from(validSet);

  function dailyIndex(dateStr) {
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
    }
    return hash % ANSWER_LIST.length;
  }

  function getDailyWord(date) {
    let d = date instanceof Date ? date : new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kathmandu",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const parts = formatter.formatToParts(d);
    const y = parts.find(p => p.type === "year").value;
    const m = parts.find(p => p.type === "month").value;
    const day = parts.find(p => p.type === "day").value;
    const key = y + "-" + m + "-" + day;
    const idx = dailyIndex(key);
    return { word: ANSWER_LIST[idx], dateKey: key, index: idx };
  }

  function isValidGuess(word) {
    const n = normalize(word);
    if (n.length !== 5) return false;
    if (validSet.has(n)) return true;
    for (let i = 0; i < n.length; i++) {
      const code = n.charCodeAt(i);
      if (code < 0x0900 || code > 0x097F) return false;
    }
    return true;
  }

  function getRandomAnswer() {
    return ANSWER_LIST[Math.floor(Math.random() * ANSWER_LIST.length)];
  }

  global.NepaliWordleWords = {
    ANSWERS: ANSWER_LIST,
    VALID: VALID_LIST,
    getDailyWord: getDailyWord,
    isValidGuess: isValidGuess,
    getRandomAnswer: getRandomAnswer,
    normalize: normalize
  };
})(typeof window !== "undefined" ? window : globalThis);
