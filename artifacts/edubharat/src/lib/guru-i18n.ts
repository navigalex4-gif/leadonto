export interface GuruTranslations {
  nav: {
    home: string;
    learn: { label: string; sub: string };
    talk: { label: string; sub: string };
    words: { label: string; sub: string };
    progress: { label: string; sub: string };
  };
  helperLang: string;
  motivation: {
    title: string;
    desc: string;
  };
  hero: {
    badge: string;
    greeting: (name: string) => string;
    continueTitleReturning: string;
    continueTitleNew: string;
    lessonTagReturning: string;
    lessonTagNew: string;
    ctaReturning: string;
    ctaNew: string;
  };
  unit: {
    tag: string;
    progress: string;
    title: string;
    desc: string;
    resumeBtn: string;
  };
  roadmap: {
    title: string;
    sub: string;
    stepBadge: string;
    startBadge: string;
    doneBadge: string;
    steps: Array<{
      id: number;
      native: string;
      en: string;
      desc: string;
    }>;
  };
  activities: {
    title: string;
    sub: string;
    items: Array<{
      id: string;
      titleNative: string;
      titleEn: string;
      descNative: string;
      badge: string;
    }>;
  };
  scenarios: {
    title: string;
    tea: { title: string; sub: string };
    job: { title: string; sub: string };
    market: { title: string; sub: string };
  };
  sidebar: {
    dailyGoal: string;
    goalLeft: (xp: number) => string;
    goalDone: string;
    thisWeek: string;
    streakDays: (days: number) => string;
    streakTip: string;
    quests: string;
    quest1: string;
    quest2: string;
    wordTitle: string;
    wordPronounce: string;
    wordMeaning: string;
  };
}

const HINDI: GuruTranslations = {
  nav: {
    home: "होम · Home",
    learn: { label: "सीखें", sub: "Learn" },
    talk: { label: "प्रिया से बात करें", sub: "Talk with Priya" },
    words: { label: "मेरे शब्द", sub: "My words" },
    progress: { label: "मेरी प्रगति", sub: "Progress" },
  },
  helperLang: "सहायक भाषा · Helper",
  motivation: {
    title: "रोज़ सिर्फ़ 5 मिनट",
    desc: "रोज़ 5 मिनट बोलकर अभ्यास करने से 30 दिनों में अंग्रेजी बोलने की झिझक दूर हो जाती है।",
  },
  hero: {
    badge: "प्रिया मैम · Priya Ma'am",
    greeting: (name) => `नमस्ते ${name}!`,
    continueTitleReturning: "जहाँ आपने छोड़ा था, वहीं से आगे बढ़ें। आज का अभ्यास तैयार है।",
    continueTitleNew: "अंग्रेज़ी सीखने का सफ़र शुरू करें। बिना किसी डर के 5 मिनट बोलिए।",
    lessonTagReturning: "यूनिट 1 · पाठ 4: आप क्या करते हैं? (What do you do?)",
    lessonTagNew: "यूनिट 1 · पाठ 1: नमस्ते और अपना परिचय देना",
    ctaReturning: "जहाँ रुके थे वहीं से शुरू करें · Continue",
    ctaNew: "पहला पाठ शुरू करें · Start Day 1",
  },
  unit: {
    tag: "UNIT 1 · भाग 1",
    progress: "3 / 7 पूरे · 43%",
    title: "अपना परिचय देना · Self Introduction",
    desc: "किसी से मिलने पर अपना नाम, शहर और काम आत्मविश्वास से बताएं।",
    resumeBtn: "पाठ जारी रखें · Resume",
  },
  roadmap: {
    title: "यूनिट 1 के पाठ · Lesson Roadmap",
    sub: "क्रमवार अभ्यास पूरा करें और नए शब्द व वाक्य सीखें",
    stepBadge: "पाठ",
    startBadge: "शुरू करें",
    doneBadge: "पूरा हुआ",
    steps: [
      { id: 1, native: "नमस्ते", en: "Hello!", desc: "बुनियादी अभिवादन सीखें" },
      { id: 2, native: "मेरा नाम…", en: "My name is…", desc: "अपना नाम बताना" },
      { id: 3, native: "आप कहाँ से हैं?", en: "Where are you from?", desc: "शहर और घर की बात" },
      { id: 4, native: "आप क्या करते हैं?", en: "What do you do?", desc: "काम और पढ़ाई की चर्चा" },
      { id: 5, native: "गिनती और समय", en: "Numbers & Time", desc: "संख्या और घड़ी का समय" },
      { id: 6, native: "इनाम व प्रमाण पत्र", en: "Unit 1 Reward", desc: "यूनिट 1 पूरा करने पर बोनस" },
    ],
  },
  activities: {
    title: "गतिविधियाँ और अभ्यास · 7 Activities",
    sub: "बोलने, सुनने, व्याकरण और रोज़मर्रा की बातों का संपूर्ण अभ्यास",
    items: [
      { id: "speaking", titleNative: "बोलने का अभ्यास", titleEn: "Speaking Practice", descNative: "माइक से बोलें और तुरंत अपना उच्चारण चेक करें", badge: "लोकप्रिय" },
      { id: "daily", titleNative: "रोज़मर्रा की बातचीत", titleEn: "Daily Conversations", descNative: "चाय की दुकान, दफ़्तर और बाज़ार की असली बातें", badge: "लाइव वॉइस" },
      { id: "vocab", titleNative: "नए शब्द और उनके अर्थ", titleEn: "Vocabulary Bank", descNative: "दिन में 3 नए शब्द, सही उच्चारण और अर्थ", badge: "शब्दावली" },
      { id: "grammar", titleNative: "व्याकरण आसान भाषा में", titleEn: "Grammar in Simple Hindi", descNative: "गलतियां समझें: Is/Am/Are, Was/Were, Has/Have", badge: "सरल नियम" },
      { id: "sentence", titleNative: "वाक्य निर्माण", titleEn: "Sentence Building", descNative: "छोटे-छोटे शब्दों को जोड़कर पूरे वाक्य बनाएं", badge: "अभ्यास" },
      { id: "listening", titleNative: "सुनना और उच्चारण", titleEn: "Listening & Pronunciation", descNative: "नेटिव आवाज़ में ध्यान से सुनें और सही लहज़ा सीखें", badge: "ऑडियो ड्रिल" },
      { id: "scenarios", titleNative: "असली जीवन की स्थितियां", titleEn: "Real-Life Scenarios", descNative: "दुकान, दफ़्तर, इंटरव्यू और यात्रा की बातचीत", badge: "रोल-प्ले" },
    ],
  },
  scenarios: {
    title: "असली बातचीत करें · Real Scenarios",
    tea: { title: "चाय की दुकान पर", sub: "At tea shop · 3 min" },
    job: { title: "नौकरी का इंटरव्यू", sub: "Job interview · 5 min" },
    market: { title: "बाज़ार में खरीदारी", sub: "At market · 3 min" },
  },
  sidebar: {
    dailyGoal: "आज का लक्ष्य · Daily Goal",
    goalLeft: (xp) => `बस ${xp} XP और चाहिए!`,
    goalDone: "लक्ष्य पूरा हुआ! 🎉",
    thisWeek: "इस हफ़्ते · This Week",
    streakDays: (days) => `${days} दिन लगातार`,
    streakTip: "कल भी आइए, अपना सीखने का सिलसिला बनाए रखिए।",
    quests: "आज के काम · Daily Quests",
    quest1: "10 वाक्य बोलिए",
    quest2: "3 नए शब्द सीखिए",
    wordTitle: "आज का शब्द · Word",
    wordPronounce: "पर्सिवीयर",
    wordMeaning: "लगे रहना · डटे रहना",
  },
};

const MARATHI: GuruTranslations = {
  nav: {
    home: "होम · Home",
    learn: { label: "शिका", sub: "Learn" },
    talk: { label: "प्रिया मॅडमशी बोला", sub: "Talk with Priya" },
    words: { label: "माझे शब्द", sub: "My words" },
    progress: { label: "माझी प्रगती", sub: "Progress" },
  },
  helperLang: "मदतनीस भाषा · Helper",
  motivation: {
    title: "दररोज फक्त ५ मिनिटे",
    desc: "दररोज ५ मिनिटे बोलण्याचा सराव केल्याने ३० दिवसांत इंग्रजी बोलण्याची भीती निघून जाते.",
  },
  hero: {
    badge: "प्रिया मॅडम · AI Coach",
    greeting: (name) => `नमस्कार ${name}!`,
    continueTitleReturning: "तुम्ही जिथे थांबला होतात तिथून पुढे सुरू करा. आजचा सराव तयार आहे.",
    continueTitleNew: "इंग्रजी शिकण्याचा प्रवास सुरू करा. न घाबरता ५ मिनिटे बोला.",
    lessonTagReturning: "युनिट १ · पाठ ४: तुम्ही काय करता? (What do you do?)",
    lessonTagNew: "युनिट १ · पाठ १: नमस्कार आणि स्वतःची ओळख",
    ctaReturning: "जिथून थांबलात तिथून सुरू करा · Continue",
    ctaNew: "पहिला पाठ सुरू करा · Start Day 1",
  },
  unit: {
    tag: "UNIT 1 · भाग १",
    progress: "३ / ७ पूर्ण · ४३%",
    title: "स्वतःची ओळख करून देणे · Self Introduction",
    desc: "कोणालाही भेटल्यावर आपले नाव, शहर आणि काम आत्मविश्वासाने सांगा.",
    resumeBtn: "सराव सुरू ठेवा · Resume",
  },
  roadmap: {
    title: "युनिट १ चे पाठ · Lesson Roadmap",
    sub: "क्रमाने सराव पूर्ण करा आणि नवीन शब्द व वाक्ये शिका",
    stepBadge: "पाठ",
    startBadge: "सुरू करा",
    doneBadge: "पूर्ण झाले",
    steps: [
      { id: 1, native: "नमस्कार", en: "Hello!", desc: "मूलभूत अभिवादन शिका" },
      { id: 2, native: "माझे नाव…", en: "My name is…", desc: "आपले नाव सांगणे" },
      { id: 3, native: "तुम्ही कुठून आहात?", en: "Where are you from?", desc: "गाव आणि घराविषयी बोलणे" },
      { id: 4, native: "तुम्ही काय करता?", en: "What do you do?", desc: "काम आणि शिक्षणाविषयी चर्चा" },
      { id: 5, native: "संख्या आणि वेळ", en: "Numbers & Time", desc: "संख्या आणि घड्याळाची वेळ" },
      { id: 6, native: "बक्षीस व प्रमाणपत्र", en: "Unit 1 Reward", desc: "युनिट १ पूर्ण केल्यावर बोनस" },
    ],
  },
  activities: {
    title: "क्रियाकलाप आणि सराव · 7 Activities",
    sub: "बोलणे, ऐकणे, व्याकरण आणि रोजच्या संभाषणाचा संपूर्ण सराव",
    items: [
      { id: "speaking", titleNative: "बोलण्याचा सराव", titleEn: "Speaking Practice", descNative: "माईकमध्ये बोला आणि तुमचे उच्चार त्वरित तपासा", badge: "लोकप्रिय" },
      { id: "daily", titleNative: "दैनंदिन संभाषण", titleEn: "Daily Conversations", descNative: "चहाची टपरी, कार्यालय आणि बाजारातील खरी संभाषणे", badge: "लाइव्ह आवाज" },
      { id: "vocab", titleNative: "नवीन शब्द आणि अर्थ", titleEn: "Vocabulary Bank", descNative: "दररोज ३ नवीन शब्द, योग्य उच्चार आणि मराठीत अर्थ", badge: "शब्दसंग्रह" },
      { id: "grammar", titleNative: "सोपे व्याकरण", titleEn: "Grammar in Simple Marathi", descNative: "चूका समजून घ्या: Is/Am/Are, Was/Were, Has/Have", badge: "सोपे नियम" },
      { id: "sentence", titleNative: "वाक्य रचना", titleEn: "Sentence Building", descNative: "लहान शब्द जोडून अर्थपूर्ण पूर्ण वाक्ये बनवा", badge: "संवाद" },
      { id: "listening", titleNative: "ऐकणे आणि उच्चार", titleEn: "Listening & Pronunciation", descNative: "नेटिव्ह आवाजात लक्षपूर्वक ऐका आणि योग्य लहेजा शिका", badge: "ऑडिओ ड्रिल" },
      { id: "scenarios", titleNative: "खऱ्या आयुष्यातील प्रसंग", titleEn: "Real-Life Scenarios", descNative: "दुकान, कार्यालय, मुलाखत आणि प्रवासातील संवाद", badge: "रोल-प्ले" },
    ],
  },
  scenarios: {
    title: "प्रत्यक्ष संवाद साधा · Real Scenarios",
    tea: { title: "चहाच्या दुकानावर", sub: "Tea shop · 3 min" },
    job: { title: "नोकरीची मुलाखत", sub: "Job interview · 5 min" },
    market: { title: "बाजारात खरेदी", sub: "Market shopping · 3 min" },
  },
  sidebar: {
    dailyGoal: "आजचे ध्येय · Daily Goal",
    goalLeft: (xp) => `फक्त ${xp} XP बाकी!`,
    goalDone: "ध्येय पूर्ण झाले! 🎉",
    thisWeek: "या आठवड्यात · This Week",
    streakDays: (days) => `${days} दिवस सलग`,
    streakTip: "उद्याही या, तुमचा शिकण्याचा सातत्य (streak) चालू ठेवा.",
    quests: "आजची कामे · Daily Quests",
    quest1: "१० वाक्ये बोला",
    quest2: "३ नवीन शब्द शिका",
    wordTitle: "आजचा शब्द · Word",
    wordPronounce: "पर्सिव्हीअर",
    wordMeaning: "चिकाटी ठेवणे · लगेच हार न मानणे",
  },
};

const PUNJABI: GuruTranslations = {
  nav: {
    home: "ਹੋਮ · Home",
    learn: { label: "ਸਿੱਖੋ", sub: "Learn" },
    talk: { label: "ਪ੍ਰਿਆ ਮੈਡਮ ਨਾਲ ਗੱਲ ਕਰੋ", sub: "Talk with Priya" },
    words: { label: "ਮੇਰੇ ਸ਼ਬਦ", sub: "My words" },
    progress: { label: "ਮੇਰੀ ਤਰੱਕੀ", sub: "Progress" },
  },
  helperLang: "ਮਦਦਗਾਰ ਭਾਸ਼ਾ · Helper",
  motivation: {
    title: "ਰੋਜ਼ਾਨਾ ਸਿਰਫ਼ 5 ਮਿੰਟ",
    desc: "ਰੋਜ਼ 5 ਮਿੰਟ ਬੋਲਣ ਦਾ ਅਭਿਆਸ ਕਰਨ ਨਾਲ 30 ਦਿਨਾਂ ਵਿੱਚ ਅੰਗਰੇਜ਼ੀ ਬੋਲਣ ਦਾ ਡਰ ਖ਼ਤਮ ਹੋ ਜਾਂਦਾ ਹੈ।",
  },
  hero: {
    badge: "ਪ੍ਰਿਆ ਮੈਡਮ · AI Coach",
    greeting: (name) => `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ${name}!`,
    continueTitleReturning: "ਜਿੱਥੇ ਤੁਸੀਂ ਛੱਡਿਆ ਸੀ, ਉੱਥੋਂ ਹੀ ਅੱਗੇ ਵਧੋ। ਅੱਜ ਦਾ ਅਭਿਆਸ ਤਿਆਰ ਹੈ।",
    continueTitleNew: "ਅੰਗਰੇਜ਼ੀ ਸਿੱਖਣ ਦਾ ਸਫ਼ਰ ਸ਼ੁਰੂ ਕਰੋ। ਬਿਨਾਂ ਕਿਸੇ ਡਰ ਦੇ 5 ਮਿੰਟ ਬੋਲੋ।",
    lessonTagReturning: "ਯੂਨਿਟ 1 · ਪਾਠ 4: ਤੁਸੀਂ ਕੀ ਕਰਦੇ ਹੋ? (What do you do?)",
    lessonTagNew: "ਯੂਨਿਟ 1 · ਪਾਠ 1: ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਅਤੇ ਆਪਣਾ ਪਰਿਚੈ",
    ctaReturning: "ਜਿੱਥੇ ਰੁਕੇ ਸੀ ਉੱਥੋਂ ਸ਼ੁਰੂ ਕਰੋ · Continue",
    ctaNew: "ਪਹਿਲਾ ਪਾਠ ਸ਼ੁਰੂ ਕਰੋ · Start Day 1",
  },
  unit: {
    tag: "UNIT 1 · ਭਾਗ 1",
    progress: "3 / 7 ਪੂਰੇ · 43%",
    title: "ਆਪਣੀ ਪਛਾਣ ਦੱਸਣਾ · Self Introduction",
    desc: "ਕਿਸੇ ਨੂੰ ਮਿਲਣ ਵੇਲੇ ਆਪਣਾ ਨਾਮ, ਸ਼ਹਿਰ ਅਤੇ ਕੰਮ ਆਤਮ-ਵਿਸ਼ਵਾਸ ਨਾਲ ਦੱਸੋ।",
    resumeBtn: "ਪਾਠ ਜਾਰੀ ਰੱਖੋ · Resume",
  },
  roadmap: {
    title: "ਯੂਨਿਟ 1 ਦੇ ਪਾਠ · Lesson Roadmap",
    sub: "ਕ੍ਰਮਵਾਰ ਅਭਿਆਸ ਪੂਰਾ ਕਰੋ ਅਤੇ ਨਵੇਂ ਸ਼ਬਦ ਤੇ ਵਾਕ ਸਿੱਖੋ",
    stepBadge: "ਪਾਠ",
    startBadge: "ਸ਼ੁਰੂ ਕਰੋ",
    doneBadge: "ਪੂਰਾ ਹੋਇਆ",
    steps: [
      { id: 1, native: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ", en: "Hello!", desc: "ਮੁੱਢਲੀ ਸ਼ੁਭਕਾਮਨਾ ਸਿੱਖੋ" },
      { id: 2, native: "ਮੇਰਾ ਨਾਮ…", en: "My name is…", desc: "ਆਪਣਾ ਨਾਮ ਦੱਸਣਾ" },
      { id: 3, native: "ਤੁਸੀਂ ਕਿੱਥੋਂ ਹੋ?", en: "Where are you from?", desc: "ਸ਼ਹਿਰ ਅਤੇ ਘਰ ਦੀ ਗੱਲ" },
      { id: 4, native: "ਤੁਸੀਂ ਕੀ ਕਰਦੇ ਹੋ?", en: "What do you do?", desc: "ਕੰਮ ਅਤੇ ਪੜ੍ਹਾਈ ਬਾਰੇ" },
      { id: 5, native: "ਗਿਣਤੀ ਅਤੇ ਸਮਾਂ", en: "Numbers & Time", desc: "ਨੰਬਰ ਅਤੇ ਘੜੀ ਦਾ ਸਮਾਂ" },
      { id: 6, native: "ਇਨਾਮ ਅਤੇ ਸਰਟੀਫਿਕੇਟ", en: "Unit 1 Reward", desc: "ਯੂਨਿਟ 1 ਪੂਰਾ ਕਰਨ ਤੇ ਬੋਨਸ" },
    ],
  },
  activities: {
    title: "ਗਤੀਵਿਧੀਆਂ ਅਤੇ ਅਭਿਆਸ · 7 Activities",
    sub: "ਬੋਲਣ, ਸੁਣਨ, ਵਿਆਕਰਨ ਅਤੇ ਰੋਜ਼ਾਨਾ ਗੱਲਬਾਤ ਦਾ ਸੰਪੂਰਨ ਅਭਿਆਸ",
    items: [
      { id: "speaking", titleNative: "ਬੋਲਣ ਦਾ ਅਭਿਆਸ", titleEn: "Speaking Practice", descNative: "ਮਾਈਕ ਵਿੱਚ ਬੋਲੋ ਅਤੇ ਤੁਰੰਤ ਆਪਣਾ ਉਚਾਰਨ ਚੈੱਕ ਕਰੋ", badge: "ਮਕਬੂਲ" },
      { id: "daily", titleNative: "ਰੋਜ਼ਾਨਾ ਗੱਲਬਾਤ", titleEn: "Daily Conversations", descNative: "ਚਾਹ ਦੀ ਦੁਕਾਨ, ਦਫ਼ਤਰ ਅਤੇ ਬਾਜ਼ਾਰ ਦੀ ਅਸਲ ਗੱਲਬਾਤ", badge: "ਲਾਈਵ ਵਾਇਸ" },
      { id: "vocab", titleNative: "ਨਵੇਂ ਸ਼ਬਦ ਅਤੇ ਅਰਥ", titleEn: "Vocabulary Bank", descNative: "ਦਿਨ ਵਿੱਚ 3 ਨਵੇਂ ਸ਼ਬਦ, ਸਹੀ ਉਚਾਰਨ ਅਤੇ ਪੰਜਾਬੀ ਅਰਥ", badge: "ਸ਼ਬਦਾਵਲੀ" },
      { id: "grammar", titleNative: "ਸਰਲ ਵਿਆਕਰਨ", titleEn: "Grammar in Simple Punjabi", descNative: "ਗਲਤੀਆਂ ਸਮਝੋ: Is/Am/Are, Was/Were, Has/Have", badge: "ਸੌਖਾ ਢੰਗ" },
      { id: "sentence", titleNative: "ਵਾਕ ਬਣਾਉਣਾ", titleEn: "Sentence Building", descNative: "ਛੋਟੇ ਸ਼ਬਦ ਜੋੜ ਕੇ ਪੂਰੇ ਵਾਕ ਬਣਾਓ", badge: "ਇੰਟਰਐਕਟਿਵ" },
      { id: "listening", titleNative: "ਸੁਣਨਾ ਅਤੇ ਉਚਾਰਨ", titleEn: "Listening & Pronunciation", descNative: "ਨੇਟਿਵ ਆਵਾਜ਼ ਧਿਆਨ ਨਾਲ ਸੁਣੋ ਅਤੇ ਲਹਿਜ਼ਾ ਸਿੱਖੋ", badge: "ਆਡੀਓ" },
      { id: "scenarios", titleNative: "ਅਸਲ ਜ਼ਿੰਦਗੀ ਦੇ ਹਾਲਾਤ", titleEn: "Real-Life Scenarios", descNative: "ਦੁਕਾਨ, ਦਫ਼ਤਰ, ਇੰਟਰਵਿਊ ਅਤੇ ਯਾਤਰਾ ਦੀ ਗੱਲਬਾਤ", badge: "ਰੋਲ-ਪਲੇ" },
    ],
  },
  scenarios: {
    title: "ਅਸਲ ਗੱਲਬਾਤ ਕਰੋ · Real Scenarios",
    tea: { title: "ਚਾਹ ਦੀ ਦੁਕਾਨ 'ਤੇ", sub: "Tea shop · 3 min" },
    job: { title: "ਨੌਕਰੀ ਦਾ ਇੰਟਰਵਿਊ", sub: "Job interview · 5 min" },
    market: { title: "ਬਾਜ਼ਾਰ ਵਿੱਚ ਖਰੀਦਦਾਰੀ", sub: "Market · 3 min" },
  },
  sidebar: {
    dailyGoal: "ਅੱਜ ਦਾ ਟੀਚਾ · Daily Goal",
    goalLeft: (xp) => `ਸਿਰਫ਼ ${xp} XP ਹੋਰ ਚਾਹੀਦੇ ਹਨ!`,
    goalDone: "ਟੀਚਾ ਪੂਰਾ ਹੋਇਆ! 🎉",
    thisWeek: "ਇਸ ਹਫ਼ਤੇ · This Week",
    streakDays: (days) => `${days} ਦਿਨ ਲਗਾਤਾਰ`,
    streakTip: "ਕੱਲ੍ਹ ਵੀ ਆਓ, ਸਿੱਖਣ ਦਾ ਸਿਲਸਿਲਾ ਬਣਾਈ ਰੱਖੋ।",
    quests: "ਅੱਜ ਦੇ ਕੰਮ · Daily Quests",
    quest1: "10 ਵਾਕ ਬੋਲੋ",
    quest2: "3 ਨਵੇਂ ਸ਼ਬਦ ਸਿੱਖੋ",
    wordTitle: "ਅੱਜ ਦਾ ਸ਼ਬਦ · Word",
    wordPronounce: "ਪਰਸਿਵੀਅਰ",
    wordMeaning: "ਲੱਗੇ ਰਹਿਣਾ · ਹਿੰਮਤ ਨਾ ਹਾਰਨਾ",
  },
};

const BENGALI: GuruTranslations = {
  nav: {
    home: "হোম · Home",
    learn: { label: "শিখুন", sub: "Learn" },
    talk: { label: "প্রিয়া ম্যাডামের সাথে কথা বলুন", sub: "Talk with Priya" },
    words: { label: "আমার শব্দ", sub: "My words" },
    progress: { label: "আমার অগ্রগতি", sub: "Progress" },
  },
  helperLang: "সহায়ক ভাষা · Helper",
  motivation: {
    title: "প্রতিদিন মাত্র ৫ মিনিট",
    desc: "প্রতিদিন ৫ মিনিট কথা বলার অভ্যাস করলে ৩০ দিনে ইংরেজি বলার ভয় দূর হয়।",
  },
  hero: {
    badge: "প্রিয়া ম্যাডাম · AI Coach",
    greeting: (name) => `নমস্কার ${name}!`,
    continueTitleReturning: "যেখান থেকে থেমেছিলেন সেখান থেকেই শুরু করুন। আজকের পাঠ প্রস্তুত।",
    continueTitleNew: "ইংরেজি শেখার যাত্রা শুরু করুন। ভয় ছাড়া ৫ মিনিট কথা বলুন।",
    lessonTagReturning: "ইউনিট ১ · পাঠ ৪: আপনি কী করেন? (What do you do?)",
    lessonTagNew: "ইউনিট ১ · পাঠ ১: নমস্কার এবং নিজের পরিচয়",
    ctaReturning: "যেখান থেকে থেমেছিলেন সেখান থেকে শুরু করুন · Continue",
    ctaNew: "প্রথম পাঠ শুরু করুন · Start Day 1",
  },
  unit: {
    tag: "UNIT 1 · ভাগ ১",
    progress: "৩ / ৭ সম্পূর্ণ · ৪৩%",
    title: "নিজের পরিচয় দেওয়া · Self Introduction",
    desc: "কারো সাথে দেখা হলে নিজের নাম, শহর ও কাজ আত্মবিশ্বাসের সাথে বলুন।",
    resumeBtn: "পাঠ চালিয়ে যান · Resume",
  },
  roadmap: {
    title: "ইউনিট ১-এর পাঠ · Lesson Roadmap",
    sub: "ধারাবাহিক অনুশীলন করুন এবং নতুন শব্দ ও বাক্য শিখুন",
    stepBadge: "পাঠ",
    startBadge: "শুরু করুন",
    doneBadge: "সম্পন্ন",
    steps: [
      { id: 1, native: "নমস্কার", en: "Hello!", desc: "প্রাথমিক শুভেচ্ছা শিখুন" },
      { id: 2, native: "আমার নাম…", en: "My name is…", desc: "নিজের নাম বলা" },
      { id: 3, native: "আপনি কোথা থেকে এসেছেন?", en: "Where are you from?", desc: "শহর ও বাড়ির কথা" },
      { id: 4, native: "আপনি কী করেন?", en: "What do you do?", desc: "কাজ ও পড়াশোনার আলোচনা" },
      { id: 5, native: "সংখ্যা এবং সময়", en: "Numbers & Time", desc: "সংখ্যা ও ঘড়ির সময়" },
      { id: 6, native: "পুরস্কার ও সনদ", en: "Unit 1 Reward", desc: "ইউনিট ১ শেষ করার বোনাস" },
    ],
  },
  activities: {
    title: "কার্যক্রম ও অনুশীলন · 7 Activities",
    sub: "বলা, শোনা, ব্যাকরণ এবং দৈনন্দিন কথোপকথনের সম্পূর্ণ অনুশীলন",
    items: [
      { id: "speaking", titleNative: "বলার অনুশীলন", titleEn: "Speaking Practice", descNative: "মাইকে কথা বলুন এবং তাৎক্ষণিক উচ্চারণ যাচাই করুন", badge: "জনপ্রিয়" },
      { id: "daily", titleNative: "দৈনন্দিন কথোপকথন", titleEn: "Daily Conversations", descNative: "চায়ের দোকান, অফিস ও বাজারের বাস্তব আলোচনা", badge: "লাইভ ভয়েস" },
      { id: "vocab", titleNative: "নতুন শব্দ ও অর্থ", titleEn: "Vocabulary Bank", descNative: "প্রতিদিন ৩টি নতুন শব্দ, উচ্চারণ ও বাংলায় অর্থ", badge: "শব্দকোষ" },
      { id: "grammar", titleNative: "সহজ ব্যাকরণ", titleEn: "Grammar in Simple Bengali", descNative: "ভুল বুঝুন: Is/Am/Are, Was/Were, Has/Have", badge: "সহজ নিয়ম" },
      { id: "sentence", titleNative: "বাক্য গঠন", titleEn: "Sentence Building", descNative: "ছোট ছোট শব্দ জুড়ে সম্পূর্ণ বাক্য তৈরি করুন", badge: "ইন্টারেক্টিভ" },
      { id: "listening", titleNative: "শোনা এবং উচ্চারণ", titleEn: "Listening & Pronunciation", descNative: "নেটিভ কণ্ঠে শুনুন এবং সঠিক উচ্চারণ শিখুন", badge: "অডিও ড্রিল" },
      { id: "scenarios", titleNative: "বাস্তব জীবনের পরিস্থিতি", titleEn: "Real-Life Scenarios", descNative: "দোকান, অফিস, ইন্টারভিউ ও ভ্রমণের কথোপকথন", badge: "রোল-প্লে" },
    ],
  },
  scenarios: {
    title: "বাস্তব কথোপকথন করুন · Real Scenarios",
    tea: { title: "চায়ের দোকানে", sub: "Tea shop · 3 min" },
    job: { title: "চাকরির ইন্টারভিউ", sub: "Job interview · 5 min" },
    market: { title: "বাজারে কেনাকাটা", sub: "Market · 3 min" },
  },
  sidebar: {
    dailyGoal: "আজকের লক্ষ্য · Daily Goal",
    goalLeft: (xp) => `আর মাত্র ${xp} XP প্রয়োজন!`,
    goalDone: "লক্ষ্য অর্জিত হয়েছে! 🎉",
    thisWeek: "এই সপ্তাহে · This Week",
    streakDays: (days) => `${days} দিন টানা`,
    streakTip: "কালও আসুন, অনুশীলনের ধারাবাহিকতা বজায় রাখুন।",
    quests: "আজকের কাজ · Daily Quests",
    quest1: "১০টি বাক্য বলুন",
    quest2: "৩টি নতুন শব্দ শিখুন",
    wordTitle: "আজকের শব্দ · Word",
    wordPronounce: "পারসিভিয়ার",
    wordMeaning: "অধ্যবসায় রাখা · লেগে থাকা",
  },
};

const GUJARATI: GuruTranslations = {
  nav: {
    home: "હોમ · Home",
    learn: { label: "શીખો", sub: "Learn" },
    talk: { label: "પ્રિયા મેડમ સાથે વાત કરો", sub: "Talk with Priya" },
    words: { label: "મારા શબ્દો", sub: "My words" },
    progress: { label: "મારી પ્રગતિ", sub: "Progress" },
  },
  helperLang: "સહાયક ભાષા · Helper",
  motivation: {
    title: "રોજ માત્ર 5 મિનિટ",
    desc: "દરરોજ 5 મિનિટ બોલવાની પ્રેક્ટિસ કરવાથી 30 દિવસમાં અંગ્રેજી બોલવાનો ડર દૂર થાય છે.",
  },
  hero: {
    badge: "પ્રિયા મેડમ · AI Coach",
    greeting: (name) => `નમસ્તે ${name}!`,
    continueTitleReturning: "જ્યાંથી તમે અટક્યા હતા ત્યાંથી શરૂ કરો. આજનો અભ્યાસ તૈયાર છે.",
    continueTitleNew: "અંગ્રેજી શીખવાની સફર શરૂ કરો. ડર્યા વગર 5 મિનિટ બોલો.",
    lessonTagReturning: "યુનિટ 1 · પાઠ 4: તમે શું કરો છો? (What do you do?)",
    lessonTagNew: "યુનિટ 1 · પાઠ 1: નમસ્તે અને પોતાની ઓળખ",
    ctaReturning: "જ્યાં અટક્યા હતા ત્યાંથી શરૂ કરો · Continue",
    ctaNew: "પહેલો પાઠ શરૂ કરો · Start Day 1",
  },
  unit: {
    tag: "UNIT 1 · ભાગ 1",
    progress: "3 / 7 પૂર્ણ · 43%",
    title: "પોતાની ઓળખ આપવી · Self Introduction",
    desc: "કોઈને મળવા પર પોતાનું નામ, શહેર અને કામ આત્મવિશ્વાસથી જણાવો.",
    resumeBtn: "પાઠ ચાલુ રાખો · Resume",
  },
  roadmap: {
    title: "યુનિટ 1 ના પાઠ · Lesson Roadmap",
    sub: "ક્રમવાર અભ્યાસ પૂર્ણ કરો અને નવા શબ્દો તથા વાક્યો શીખો",
    stepBadge: "પાઠ",
    startBadge: "શરૂ કરો",
    doneBadge: "પૂર્ણ થયું",
    steps: [
      { id: 1, native: "નમસ્તે", en: "Hello!", desc: "મૂળભૂત શુભેચ્છા શીખો" },
      { id: 2, native: "મારું નામ…", en: "My name is…", desc: "પોતાનું નામ જણાવવું" },
      { id: 3, native: "તમે ક્યાંથી છો?", en: "Where are you from?", desc: "શહેર અને ઘરની વાત" },
      { id: 4, native: "તમે શું કરો છો?", en: "What do you do?", desc: "કામ અને અભ્યાસની ચર્ચા" },
      { id: 5, native: "ગણતરી અને સમય", en: "Numbers & Time", desc: "સંખ્યા અને ઘડિયાળનો સમય" },
      { id: 6, native: "ઇનામ અને પ્રમાણપત્ર", en: "Unit 1 Reward", desc: "યુનિટ 1 પૂરું કરવા પર બોનસ" },
    ],
  },
  activities: {
    title: "પ્રવૃત્તિઓ અને અભ્યાસ · 7 Activities",
    sub: "બોલવા, સાંભળવા, વ્યાકરણ અને દૈનિક વાતચીતનો સંપૂર્ણ અભ્યાસ",
    items: [
      { id: "speaking", titleNative: "બોલવાનો અભ્યાસ", titleEn: "Speaking Practice", descNative: "માઇકમાં બોલો અને તુરંત તમારો ઉચ્ચાર તપાસો", badge: "લોકપ્રિય" },
      { id: "daily", titleNative: "રોજિંદી વાતચીત", titleEn: "Daily Conversations", descNative: "ચાની દુકાન, ઑફિસ અને બજારની ખરી વાતો", badge: "લાઇવ વૉઇસ" },
      { id: "vocab", titleNative: "નવા શબ્દો અને અર્થ", titleEn: "Vocabulary Bank", descNative: "રોજ 3 નવા શબ્દો, સાચો ઉચ્ચાર અને ગુજરાતીમાં અર્થ", badge: "શબ્દભંડોળ" },
      { id: "grammar", titleNative: "સરળ વ્યાકરણ", titleEn: "Grammar in Simple Gujarati", descNative: "ભૂલો સમજો: Is/Am/Are, Was/Were, Has/Have", badge: "સરળ નિયમો" },
      { id: "sentence", titleNative: "વાક્ય નિર્માણ", titleEn: "Sentence Building", descNative: "નાના શબ્દો જોડીને પૂરા વાક્યો બનાવો", badge: "ઇન્ટરેક્ટિવ" },
      { id: "listening", titleNative: "સાંભળવું અને ઉચ્ચાર", titleEn: "Listening & Pronunciation", descNative: "નેટિવ અવાજ ધ્યાનથી સાંભળો અને યોગ્ય લહેકો શીખો", badge: "ઑડિયો ડ્રિલ" },
      { id: "scenarios", titleNative: "વાસ્તવિક જીવનની સ્થિતિઓ", titleEn: "Real-Life Scenarios", descNative: "દુકાન, ઑફિસ, ઇન્ટરવ્યુ અને મુસાફરીની વાતચીત", badge: "રોલ-પ્લે" },
    ],
  },
  scenarios: {
    title: "વાસ્તવિક વાતચીત કરો · Real Scenarios",
    tea: { title: "ચાની દુકાને", sub: "Tea shop · 3 min" },
    job: { title: "નોકરીનો ઇન્ટરવ્યુ", sub: "Job interview · 5 min" },
    market: { title: "બજારમાં ખરીદી", sub: "Market · 3 min" },
  },
  sidebar: {
    dailyGoal: "આજનો લક્ષ્યાંક · Daily Goal",
    goalLeft: (xp) => `ફક્ત ${xp} XP બાકી!`,
    goalDone: "લક્ષ્ય પૂરું થયું! 🎉",
    thisWeek: "આ અઠવાડિયે · This Week",
    streakDays: (days) => `${days} દિવસ સતત`,
    streakTip: "કાલે પણ આવો, શીખવાનો ક્રમ જાળવી રાખો.",
    quests: "આજના કામ · Daily Quests",
    quest1: "10 વાક્યો બોલો",
    quest2: "3 નવા શબ્દો શીખો",
    wordTitle: "આજનો શબ્દ · Word",
    wordPronounce: "પર્સિવિઅર",
    wordMeaning: "મથ્યા રહેવું · દ્રઢ રહેવું",
  },
};

const ENGLISH: GuruTranslations = {
  nav: {
    home: "Home",
    learn: { label: "Learn", sub: "Daily drills" },
    talk: { label: "Talk with Priya", sub: "AI Voice Coach" },
    words: { label: "My Words", sub: "Vocabulary" },
    progress: { label: "My Progress", sub: "Analytics" },
  },
  helperLang: "Helper Language",
  motivation: {
    title: "Just 5 minutes daily",
    desc: "Speaking for 5 minutes each day eliminates hesitation in 30 days.",
  },
  hero: {
    badge: "Priya Ma'am · AI Coach",
    greeting: (name) => `Hello ${name}!`,
    continueTitleReturning: "Pick up right where you left off. Today's practice is ready.",
    continueTitleNew: "Start your English journey. Speak fearlessly for 5 minutes.",
    lessonTagReturning: "Unit 1 · Lesson 4: What do you do?",
    lessonTagNew: "Unit 1 · Lesson 1: Hello & Self Introduction",
    ctaReturning: "Continue where you stopped",
    ctaNew: "Start Day 1 Lesson",
  },
  unit: {
    tag: "UNIT 1 · PART 1",
    progress: "3 / 7 Completed · 43%",
    title: "Self Introduction",
    desc: "State your name, hometown, and profession with calm confidence.",
    resumeBtn: "Resume Lesson",
  },
  roadmap: {
    title: "Unit 1 Lessons · Lesson Roadmap",
    sub: "Complete structured lessons to master new words and phrases",
    stepBadge: "Lesson",
    startBadge: "Start",
    doneBadge: "Completed",
    steps: [
      { id: 1, native: "Greetings", en: "Hello!", desc: "Master basic friendly greetings" },
      { id: 2, native: "My Name", en: "My name is…", desc: "Introduce your name clearly" },
      { id: 3, native: "Hometown", en: "Where are you from?", desc: "Talk about your city & home" },
      { id: 4, native: "Profession", en: "What do you do?", desc: "Describe work & education" },
      { id: 5, native: "Numbers & Time", en: "Numbers & Time", desc: "Counting & clock timings" },
      { id: 6, native: "Unit Reward", en: "Unit 1 Reward", desc: "Bonus quiz & milestone badge" },
    ],
  },
  activities: {
    title: "Learning Activities & Drills",
    sub: "Comprehensive practice covering speaking, listening, grammar, and daily conversations",
    items: [
      { id: "speaking", titleNative: "Speaking Practice", titleEn: "Speaking Practice", descNative: "Speak into the microphone with instant pronunciation feedback", badge: "Popular" },
      { id: "daily", titleNative: "Daily Conversations", titleEn: "Daily Conversations", descNative: "Real-life dialogues at tea shops, offices, and markets", badge: "Live Voice" },
      { id: "vocab", titleNative: "Vocabulary Bank", titleEn: "Vocabulary Bank", descNative: "3 new words each day with definitions and usage drills", badge: "Vocab" },
      { id: "grammar", titleNative: "Grammar Made Simple", titleEn: "Grammar Made Simple", descNative: "Clear rules for Is/Am/Are, Was/Were, and Has/Have", badge: "Beginner" },
      { id: "sentence", titleNative: "Sentence Building", titleEn: "Sentence Building", descNative: "Combine simple word blocks into complete fluent sentences", badge: "Interactive" },
      { id: "listening", titleNative: "Listening & Pronunciation", titleEn: "Listening & Pronunciation", descNative: "Listen closely to native speakers and refine your cadence", badge: "Audio Drill" },
      { id: "scenarios", titleNative: "Real-Life Scenarios", titleEn: "Real-Life Scenarios", descNative: "Practical roleplay for stores, offices, interviews, and travel", badge: "Roleplay" },
    ],
  },
  scenarios: {
    title: "Real-Life Scenarios",
    tea: { title: "At the Tea Shop", sub: "Ordering & chat · 3 min" },
    job: { title: "Job Interview", sub: "HR & intro · 5 min" },
    market: { title: "Market Shopping", sub: "Bargaining & buy · 3 min" },
  },
  sidebar: {
    dailyGoal: "Daily Goal",
    goalLeft: (xp) => `Only ${xp} XP remaining!`,
    goalDone: "Daily Goal Completed! 🎉",
    thisWeek: "This Week",
    streakDays: (days) => `${days} Day Streak`,
    streakTip: "Return tomorrow to maintain your active learning streak.",
    quests: "Daily Quests",
    quest1: "Speak 10 sentences",
    quest2: "Learn 3 new words",
    wordTitle: "Word of the Day",
    wordPronounce: "Per-se-vere",
    wordMeaning: "Keep going persistently despite difficulties",
  },
};

const REGISTRY: Record<string, GuruTranslations> = {
  Hindi: HINDI,
  Marathi: MARATHI,
  Punjabi: PUNJABI,
  Bengali: BENGALI,
  Gujarati: GUJARATI,
  English: ENGLISH,
};

export function getGuruTranslations(lang: string | undefined): GuruTranslations {
  if (!lang) return HINDI;
  const normalized = lang.trim();
  if (REGISTRY[normalized]) return REGISTRY[normalized]!;

  // Fallback map for South / East Indian languages to avoid English-only defaults
  if (normalized === "Tamil") {
    return {
      ...HINDI,
      helperLang: "உதவி மொழி · Helper",
      nav: {
        home: "முகப்பு · Home",
        learn: { label: "கற்க", sub: "Learn" },
        talk: { label: "பிரியாவிடம் பேசுங்கள்", sub: "Talk with Priya" },
        words: { label: "என் சொற்கள்", sub: "My words" },
        progress: { label: "என் முன்னேற்றம்", sub: "Progress" },
      },
      hero: {
        ...HINDI.hero,
        greeting: (name) => `வணக்கம் ${name}!`,
        ctaReturning: "நிறுத்திய இடத்திலிருந்து தொடரவும் · Continue",
      },
      sidebar: {
        ...HINDI.sidebar,
        dailyGoal: "இன்றைய இலக்கு · Daily Goal",
        wordPronounce: "பெர்சிவியர்",
        wordMeaning: "தொடர்ந்து விடாமுயற்சி செய்தல்",
      },
    };
  }

  if (normalized === "Telugu") {
    return {
      ...HINDI,
      helperLang: "సహాయక భాష · Helper",
      nav: {
        home: "హోమ్ · Home",
        learn: { label: "నేర్చుకోండి", sub: "Learn" },
        talk: { label: "ప్రియాతో మాట్లాడండి", sub: "Talk with Priya" },
        words: { label: "నా పదాలు", sub: "My words" },
        progress: { label: "నా పురోగతి", sub: "Progress" },
      },
      hero: {
        ...HINDI.hero,
        greeting: (name) => `నమస్కారం ${name}!`,
        ctaReturning: "ఆపిన చోటు నుంచే కొనసాగించండి · Continue",
      },
      sidebar: {
        ...HINDI.sidebar,
        dailyGoal: "నేటి లక్ష్యం · Daily Goal",
        wordPronounce: "పెర్సివియర్",
        wordMeaning: "పట్టువదలకుండా ప్రయత్నించడం",
      },
    };
  }

  if (normalized === "Kannada") {
    return {
      ...HINDI,
      helperLang: "ಸಹಾಯಕ ಭಾಷೆ · Helper",
      nav: {
        home: "ಹೋಮ್ · Home",
        learn: { label: "ಕಲಿಯಿರಿ", sub: "Learn" },
        talk: { label: "ಪ್ರಿಯಾ ಜೊತೆ ಮಾತನಾಡಿ", sub: "Talk with Priya" },
        words: { label: "ನನ್ನ ಪದಗಳು", sub: "My words" },
        progress: { label: "ನನ್ನ ಪ್ರಗತಿ", sub: "Progress" },
      },
      hero: {
        ...HINDI.hero,
        greeting: (name) => `ನಮಸ್ಕಾರ ${name}!`,
        ctaReturning: "ನಿಲ್ಲಿಸಿದ ಸ್ಥಳದಿಂದಲೇ ಮುಂದುವರಿಸಿ · Continue",
      },
    };
  }

  if (normalized === "Malayalam") {
    return {
      ...HINDI,
      helperLang: "സഹായക ഭാഷ · Helper",
      nav: {
        home: "ഹോം · Home",
        learn: { label: "പഠിക്കുക", sub: "Learn" },
        talk: { label: "പ്രിയയോട് സംസാരിക്കൂ", sub: "Talk with Priya" },
        words: { label: "എന്റെ വാക്കുകൾ", sub: "My words" },
        progress: { label: "എന്റെ പുരോഗതി", sub: "Progress" },
      },
      hero: {
        ...HINDI.hero,
        greeting: (name) => `നമസ്കാരം ${name}!`,
        ctaReturning: "നിർത്തിയ ഇടത്തുനിന്ന് തുടരുക · Continue",
      },
    };
  }

  if (normalized === "Odia") {
    return {
      ...HINDI,
      helperLang: "ସହାୟକ ଭାଷା · Helper",
      nav: {
        home: "ହୋମ୍ · Home",
        learn: { label: "ଶିଖନ୍ତୁ", sub: "Learn" },
        talk: { label: "ପ୍ରିୟାଙ୍କ ସହ କଥାବାର୍ତ୍ତା", sub: "Talk with Priya" },
        words: { label: "ମୋର ଶବ୍ଦ", sub: "My words" },
        progress: { label: "ମୋର ପ୍ରଗତି", sub: "Progress" },
      },
      hero: {
        ...HINDI.hero,
        greeting: (name) => `ନମସ୍କାର ${name}!`,
        ctaReturning: "ଯେଉଁଠି ଅଟକିଥିଲେ ସେଠାରୁ ଆରମ୍ଭ କରନ୍ତୁ · Continue",
      },
    };
  }

  if (normalized === "Urdu") {
    return {
      ...HINDI,
      helperLang: "مددگار زبان · Helper",
      nav: {
        home: "ہوم · Home",
        learn: { label: "سیکھیں", sub: "Learn" },
        talk: { label: "پریا سے بات کریں", sub: "Talk with Priya" },
        words: { label: "میرے الفاظ", sub: "My words" },
        progress: { label: "میری پیش رفت", sub: "Progress" },
      },
      hero: {
        ...HINDI.hero,
        greeting: (name) => `آداب ${name}!`,
        ctaReturning: "جہاں روکے تھے وہیں سے شروع کریں · Continue",
      },
    };
  }

  return HINDI;
}
