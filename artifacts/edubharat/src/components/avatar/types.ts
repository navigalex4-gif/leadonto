export interface AvatarProviderConfig {
  provider: "css" | "heygen" | "did" | "synthesia";
  avatarId?: string;
  apiKey?: string;
}

export interface AvatarProps {
  name: string;
  subtitle: string;
  isSpeaking: boolean;
  isThinking?: boolean;
  gender?: "male" | "female";
  size?: "sm" | "md" | "lg" | "xl";
  imageSrc?: string;
  providerConfig?: AvatarProviderConfig;
  /** Skip the internal name/subtitle caption — use when the caller already
   *  shows the name elsewhere (e.g. a cramped picture-in-picture tile). */
  hideCaption?: boolean;
}

export interface TutorPersona {
  id: string;
  name: string;
  title: string;
  role: string;
  gender: "male" | "female";
  voiceStyle: string;
  voiceGender: "male" | "female";
  specialization: string;
  teachingStyle: string;
  languages: string[];
  accent: string;
  intro: string;
  imageSrc: string;
  accentColor: string;
}
