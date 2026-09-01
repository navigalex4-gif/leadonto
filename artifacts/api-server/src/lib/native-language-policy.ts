export const SUPPORTED_NATIVE_LANGUAGES = [
  "Hindi",
  "Bengali",
  "Telugu",
  "Marathi",
  "Tamil",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Punjabi",
  "Odia",
  "Urdu",
  "Assamese",
] as const;

export type SupportedNativeLanguage = (typeof SUPPORTED_NATIVE_LANGUAGES)[number];

type NativeLanguageDefinition = {
  aliases: RegExp[];
  script: RegExp;
  switchVerbs: RegExp;
  explanationVerbs: RegExp;
  postpositions: RegExp;
  confirmation: string;
};

const LANGUAGE_DEFINITIONS: Record<SupportedNativeLanguage, NativeLanguageDefinition> = {
  Hindi: {
    aliases: [/\bhindi\b/i, /हिंदी|हिन्दी/u],
    script: /[\u0900-\u097F]/u,
    switchVerbs: /(?:बोलो|बोलिए|बोला|बोलना|समझाओ|समझाइए|बताओ|बताइए)/u,
    explanationVerbs: /(?:समझाओ|समझाइए|बताओ|बताइए|मतलब|अर्थ)/u,
    postpositions: /(?:में|मे)/u,
    confirmation: "हाँ, मैं साफ़ और सही हिंदी में आपकी मदद करूँगा। आप अटकें तो मैं हिंदी में समझाऊँगा और फिर हम अंग्रेज़ी का अभ्यास जारी रखेंगे।",
  },
  Bengali: {
    aliases: [/\bbengali\b/i, /বাংলা|বাঙলা/u],
    script: /[\u0980-\u09FF]/u,
    switchVerbs: /(?:বলুন|বলো|কথা বলুন|বোঝাও|বুঝিয়ে বলুন)/u,
    explanationVerbs: /(?:বোঝাও|বুঝিয়ে|মানে|অর্থ)/u,
    postpositions: /(?:তে|য়|এ)/u,
    confirmation: "হ্যাঁ, আমি পরিষ্কার বাংলায় আপনাকে সাহায্য করব। আপনি আটকে গেলে বাংলায় বুঝিয়ে আবার ইংরেজি অনুশীলন চালিয়ে যাব।",
  },
  Telugu: {
    aliases: [/\btelugu\b/i, /తెలుగు/u],
    script: /[\u0C00-\u0C7F]/u,
    switchVerbs: /(?:మాట్లాడు|మాట్లాడండి|చెప్పండి|వివరించండి)/u,
    explanationVerbs: /(?:వివరించ|అర్థం|చెప్పండి)/u,
    postpositions: /(?:లో|గా|కి)/u,
    confirmation: "అవును, నేను స్పష్టమైన తెలుగులో మీకు సహాయం చేస్తాను. మీరు ఇబ్బంది పడితే తెలుగులో వివరించి, మళ్లీ ఇంగ్లీష్ సాధన కొనసాగిస్తాం.",
  },
  Marathi: {
    aliases: [/\bmarathi\b/i, /मराठी/u],
    script: /[\u0900-\u097F]/u,
    switchVerbs: /(?:बोलो|बोलिए|बोला|सांगा|समजावून\s*सांगा|समजाव|स्पष्ट\s*करा)/u,
    explanationVerbs: /(?:समजावून\s*सांगा|समजाव|स्पष्ट\s*करा|काय\s+म्हणतात|अर्थ)/u,
    postpositions: /(?:मध्ये|मराठीत|में)/u,
    confirmation: "हो, मी स्पष्ट आणि योग्य मराठीत तुमची मदत करेन. तुम्ही अडकलात तर मी मराठीत समजावून सांगेन आणि आपण इंग्रजीचा सराव सुरू ठेवू.",
  },
  Tamil: {
    aliases: [/\btamil\b/i, /தமிழ்|தமிழில்/u],
    script: /[\u0B80-\u0BFF]/u,
    switchVerbs: /(?:பேசு|பேசுங்கள்|சொல்லுங்கள்|விளக்குங்கள்)/u,
    explanationVerbs: /(?:விளக்க|அர்த்தம்|எப்படி\s+சொல்வது)/u,
    postpositions: /(?:இல்|தமிழில்)/u,
    confirmation: "ஆம், நான் தெளிவான தமிழில் உங்களுக்கு உதவுவேன். நீங்கள் சிக்கிக்கொண்டால் தமிழில் விளக்கி, மீண்டும் ஆங்கிலப் பயிற்சியைத் தொடர்வோம்.",
  },
  Gujarati: {
    aliases: [/\bgujarati\b/i, /ગુજરાતી/u],
    script: /[\u0A80-\u0AFF]/u,
    switchVerbs: /(?:બોલો|કહો|સમજાવો|સમજાવીને કહો)/u,
    explanationVerbs: /(?:સમજાવો|અર્થ|કહેવાય)/u,
    postpositions: /(?:માં|ગુજરાતીમાં)/u,
    confirmation: "હા, હું સ્પષ્ટ ગુજરાતીમાં તમારી મદદ કરીશ. તમે અટકી જાઓ તો ગુજરાતીમાં સમજાવીને ફરી અંગ્રેજીનો અભ્યાસ ચાલુ રાખીશું.",
  },
  Kannada: {
    aliases: [/\bkannada\b/i, /ಕನ್ನಡ/u],
    script: /[\u0C80-\u0CFF]/u,
    switchVerbs: /(?:ಮಾತನಾಡಿ|ಹೇಳಿ|ವಿವರಿಸಿ)/u,
    explanationVerbs: /(?:ವಿವರಿಸಿ|ಅರ್ಥ|ಹೇಗೆ\s+ಹೇಳ)/u,
    postpositions: /(?:ನಲ್ಲಿ|ಕನ್ನಡದಲ್ಲಿ)/u,
    confirmation: "ಹೌದು, ನಾನು ಸ್ಪಷ್ಟವಾದ ಕನ್ನಡದಲ್ಲಿ ನಿಮಗೆ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ನೀವು ಸಿಲುಕಿಕೊಂಡರೆ ಕನ್ನಡದಲ್ಲಿ ವಿವರಿಸಿ ಮತ್ತೆ ಇಂಗ್ಲಿಷ್ ಅಭ್ಯಾಸ ಮುಂದುವರಿಸುತ್ತೇವೆ.",
  },
  Malayalam: {
    aliases: [/\bmalayalam\b/i, /മലയാളം|മലയാളത്തിൽ/u],
    script: /[\u0D00-\u0D7F]/u,
    switchVerbs: /(?:സംസാരിക്കൂ|പറയൂ|വിശദീകരിക്കൂ)/u,
    explanationVerbs: /(?:വിശദീകരി|അർത്ഥം|എങ്ങനെ\s+പറയ)/u,
    postpositions: /(?:ൽ|മലയാളത്തിൽ)/u,
    confirmation: "അതെ, ഞാൻ വ്യക്തമായ മലയാളത്തിൽ നിങ്ങളെ സഹായിക്കാം. നിങ്ങൾക്ക് ബുദ്ധിമുട്ടുണ്ടെങ്കിൽ മലയാളത്തിൽ വിശദീകരിച്ച് വീണ്ടും ഇംഗ്ലീഷ് പരിശീലനം തുടരും.",
  },
  Punjabi: {
    aliases: [/\bpunjabi\b/i, /ਪੰਜਾਬੀ/u],
    script: /[\u0A00-\u0A7F]/u,
    switchVerbs: /(?:ਬੋਲੋ|ਦੱਸੋ|ਸਮਝਾਓ|ਸਮਝਾ ਕੇ ਦੱਸੋ)/u,
    explanationVerbs: /(?:ਸਮਝਾਓ|ਅਰਥ|ਕਹਿੰਦੇ)/u,
    postpositions: /(?:ਵਿੱਚ|ਪੰਜਾਬੀ ਵਿੱਚ)/u,
    confirmation: "ਹਾਂ, ਮੈਂ ਸਾਫ਼ ਪੰਜਾਬੀ ਵਿੱਚ ਤੁਹਾਡੀ ਮਦਦ ਕਰਾਂਗਾ। ਜੇ ਤੁਸੀਂ ਅਟਕੋ ਤਾਂ ਪੰਜਾਬੀ ਵਿੱਚ ਸਮਝਾ ਕੇ ਅਸੀਂ ਅੰਗਰੇਜ਼ੀ ਦੀ ਅਭਿਆਸ ਜਾਰੀ ਰੱਖਾਂਗੇ।",
  },
  Odia: {
    aliases: [/\b(?:odia|oriya)\b/i, /ଓଡ଼ିଆ|ଓଡିଆ/u],
    script: /[\u0B00-\u0B7F]/u,
    switchVerbs: /(?:କୁହନ୍ତୁ|କହନ୍ତୁ|ବୁଝାନ୍ତୁ)/u,
    explanationVerbs: /(?:ବୁଝାନ୍ତୁ|ଅର୍ଥ|କୁହାଯାଏ)/u,
    postpositions: /(?:ରେ|ଓଡ଼ିଆରେ)/u,
    confirmation: "ହଁ, ମୁଁ ସ୍ପଷ୍ଟ ଓଡ଼ିଆରେ ଆପଣଙ୍କୁ ସାହାଯ୍ୟ କରିବି। ଆପଣ ଅଟକିଗଲେ ଓଡ଼ିଆରେ ବୁଝାଇ ପୁଣି ଇଂରାଜୀ ଅଭ୍ୟାସ କରିବା।",
  },
  Urdu: {
    aliases: [/\burdu\b/i, /اردو/u],
    script: /[\u0600-\u06FF]/u,
    switchVerbs: /(?:بولیں|بات\s*کریں|بتائیں|سمجھائیں)/u,
    explanationVerbs: /(?:سمجھائیں|معنی|مطلب)/u,
    postpositions: /(?:میں|اردو\s+میں)/u,
    confirmation: "جی ہاں، میں صاف اور درست اردو میں آپ کی مدد کروں گا۔ اگر آپ رک جائیں تو میں اردو میں سمجھاؤں گا اور پھر انگریزی کی مشق جاری رکھیں گے۔",
  },
  Assamese: {
    aliases: [/\bassamese\b/i, /অসমীয়া|অসমিয়া/u],
    script: /[\u0980-\u09FF]/u,
    switchVerbs: /(?:কওক|কওঁক|কও|বুজাই দিয়ক)/u,
    explanationVerbs: /(?:বুজাই|অৰ্থ|মানে)/u,
    postpositions: /(?:ত|অসমীয়াত)/u,
    confirmation: "হয়, মই স্পষ্ট অসমীয়াত আপোনাক সহায় কৰিম। আপুনি ৰৈ গ’লে অসমীয়াত বুজাই আকৌ ইংৰাজী অনুশীলন কৰিম।",
  },
};

const ENGLISH_TRANSLATION_MARKERS = /\b(?:translate|translation|meaning|mean|explain|this|that|sentence|phrase|question|word)\b/i;
const ENGLISH_SWITCH_VERBS = /\b(?:speak|talk|switch|use|reply|respond|help)\b/i;
const COMMON_NATIVE_SWITCH_VERBS = /(?:बोल|कह|बत|करो|करिए|करें|பேசு|சொல்|మాట్లాడు|చెప్పు|বল|કહ|બોલ|ಹೇಳ|ಮಾತನಾಡು|പറയൂ|സംസാരി|ਦੱਸ|ਬੋਲ|କହ|କୁହ|بولو|کہو|بتا)/u;

export type NativeLanguageIntent = {
  language: SupportedNativeLanguage;
  translationOrExplanation: boolean;
};

export function detectNativeLanguageIntent(prompt: string, system?: string | null): NativeLanguageIntent | null {
  const text = `${prompt}\n${system ?? ""}`;
  for (const language of SUPPORTED_NATIVE_LANGUAGES) {
    const definition = LANGUAGE_DEFINITIONS[language];
    const named = definition.aliases.some((alias) => alias.test(prompt));
    if (!named) continue;

    const nativeCommand = definition.switchVerbs.test(prompt) || COMMON_NATIVE_SWITCH_VERBS.test(prompt);
    const mixedExplanation =
      definition.postpositions.test(prompt)
      && (ENGLISH_TRANSLATION_MARKERS.test(prompt) || definition.explanationVerbs.test(prompt));
    const translationOrExplanation =
      mixedExplanation
      || ENGLISH_TRANSLATION_MARKERS.test(prompt)
      || definition.explanationVerbs.test(prompt);

    // A language in the system prompt alone means that the route supports it,
    // but is not itself a request to answer in that language.
    if (!nativeCommand && !translationOrExplanation && !definition.aliases.some((alias) => alias.test(text))) continue;
    return { language, translationOrExplanation };
  }
  return null;
}

export function isDeterministicLanguageSwitch(prompt: string): SupportedNativeLanguage | null {
  const intent = detectNativeLanguageIntent(prompt);
  if (!intent || intent.translationOrExplanation) return null;
  const definition = LANGUAGE_DEFINITIONS[intent.language];
  const hasSwitchVerb =
    ENGLISH_SWITCH_VERBS.test(prompt)
    || definition.switchVerbs.test(prompt)
    || COMMON_NATIVE_SWITCH_VERBS.test(prompt);
  if (!hasSwitchVerb) return null;
  if (ENGLISH_TRANSLATION_MARKERS.test(prompt) || definition.explanationVerbs.test(prompt)) return null;
  return intent.language;
}

export function nativeLanguageConfirmation(language: SupportedNativeLanguage): string {
  return LANGUAGE_DEFINITIONS[language].confirmation;
}

export function applyNativeLanguagePolicy(prompt: string, system?: string | null): string | null | undefined {
  const intent = detectNativeLanguageIntent(prompt, system);
  if (!intent) return system;

  const language = intent.language;
  const translationInstruction = intent.translationOrExplanation
    ? `This is a ${language} translation/explanation request. Answer the exact requested word, phrase, or sentence in natural ${language} using ${language}'s standard native script. Do not answer in English, Hindi, or another Indian language. Do not acknowledge the request, invent a new practice question, or give a generic coaching reply. Preserve the meaning and return a complete answer.`
    : `This is a direct request to use ${language}. Acknowledge it in clear, natural ${language} and then follow the user's request. Do not silently substitute Hindi, English, or another Indian language.`;
  const policy = `Native-language routing policy: The named helper language is ${language}. ${translationInstruction} If the request is ambiguous or the source text is missing, ask for the missing source briefly in ${language}; never emit malformed, transliterated, over-spaced, or mixed-language script.`;
  return `${system ? `${system}\n\n` : ""}${policy}`;
}

export function hasExpectedNativeScript(text: string, language: SupportedNativeLanguage): boolean {
  const script = LANGUAGE_DEFINITIONS[language].script;
  return [...text].filter((character) => script.test(character)).length >= 2;
}