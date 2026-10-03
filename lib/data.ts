export interface Participant {
  id: string;
  name: string;
  avatar: string;
  location: string;
  nativeLanguage: string;
  learningLanguage: string;
  cefrLevel: string;
  isHost?: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  audioLevel?: number; // 0 to 100
}

export interface ChatMessage {
  id: string;
  sender: string;
  senderId?: string;
  text: string;
  time: string;
  isSystem?: boolean;
  isHost?: boolean;
  isHighlighted?: boolean;
}

export interface VoiceRoom {
  id: string;
  title: string;
  language: string;
  flag: string;
  cefrLevel: 'ANY' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'NATIVE';
  levelLabel: string;
  topicTag: string;
  activeSinceMinutes: number;
  maxParticipants: number;
  participants: Participant[];
  hasFreeSeats: boolean;
  isBeginnerFriendly: boolean;
  hasNativeSpeaker: boolean;
  isLive: boolean;
  messages: ChatMessage[];
}

export const INITIAL_ROOMS: VoiceRoom[] = [
  {
    id: 'room-1',
    title: 'Casual Chat & Coffee: Daily life, movies & cultural exchange',
    language: 'English',
    flag: '🇬🇧',
    cefrLevel: 'B1',
    levelLabel: 'Intermediate',
    topicTag: 'Casual & Culture',
    activeSinceMinutes: 38,
    maxParticipants: 6,
    hasFreeSeats: true,
    isBeginnerFriendly: false,
    hasNativeSpeaker: true,
    isLive: true,
    participants: [
      {
        id: 'p-1',
        name: 'Alex Miller',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        location: 'San Francisco, CA',
        nativeLanguage: 'English',
        learningLanguage: 'Spanish',
        cefrLevel: 'NATIVE',
        isHost: true,
        isSpeaking: true,
        isMuted: false,
        audioLevel: 75,
      },
      {
        id: 'p-2',
        name: 'Sofia Chen',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        location: 'Taipei, TW',
        nativeLanguage: 'Mandarin',
        learningLanguage: 'English',
        cefrLevel: 'B2',
        isHost: false,
        isSpeaking: false,
        isMuted: false,
        audioLevel: 0,
      },
      {
        id: 'p-3',
        name: 'Kenji Sato',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        location: 'Tokyo, JP',
        nativeLanguage: 'Japanese',
        learningLanguage: 'English',
        cefrLevel: 'B1',
        isHost: false,
        isSpeaking: false,
        isMuted: true,
        audioLevel: 0,
      },
      {
        id: 'p-4',
        name: 'Marta Braun',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        location: 'Berlin, DE',
        nativeLanguage: 'German',
        learningLanguage: 'English',
        cefrLevel: 'C1',
        isHost: false,
        isSpeaking: false,
        isMuted: false,
        audioLevel: 0,
      },
    ],
    messages: [
      { id: 'm-1', sender: 'Alex Miller', text: 'Welcome everyone! Today we discuss favorite travel destinations.', time: '14:22', isHost: true },
      { id: 'm-2', sender: 'Sofia Chen', text: 'Can you write down that English idiom you used earlier?', time: '14:23' },
      { id: 'm-3', sender: 'Alex Miller', text: '"A blessing in disguise" 🎯', time: '14:24', isHost: true, isHighlighted: true },
      { id: 'm-4', sender: 'Kenji Sato', text: 'Arigato! That makes so much sense now.', time: '14:25' },
    ],
  },
  {
    id: 'room-2',
    title: 'Spanish for Beginners: Present tense practice & greetings',
    language: 'Spanish',
    flag: '🇪🇸',
    cefrLevel: 'A1',
    levelLabel: 'Beginner A1',
    topicTag: 'Grammar & Vocab',
    activeSinceMinutes: 15,
    maxParticipants: 5,
    hasFreeSeats: true,
    isBeginnerFriendly: true,
    hasNativeSpeaker: true,
    isLive: true,
    participants: [
      {
        id: 'p-5',
        name: 'Carlos Ruiz',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        location: 'Madrid, ES',
        nativeLanguage: 'Spanish',
        learningLanguage: 'English',
        cefrLevel: 'NATIVE',
        isHost: true,
        isSpeaking: true,
        isMuted: false,
        audioLevel: 62,
      },
      {
        id: 'p-6',
        name: 'Liam Wilson',
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
        location: 'London, UK',
        nativeLanguage: 'English',
        learningLanguage: 'Spanish',
        cefrLevel: 'A1',
        isHost: false,
        isSpeaking: false,
        isMuted: false,
        audioLevel: 0,
      },
      {
        id: 'p-7',
        name: 'Emma Larson',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
        location: 'Stockholm, SE',
        nativeLanguage: 'Swedish',
        learningLanguage: 'Spanish',
        cefrLevel: 'A1',
        isHost: false,
        isSpeaking: false,
        isMuted: false,
        audioLevel: 0,
      },
    ],
    messages: [
      { id: 'm-21', sender: 'Carlos Ruiz', text: '¡Hola a todos! Bienvenidos al grupo de principiantes.', time: '14:30', isHost: true },
      { id: 'm-22', sender: 'Liam Wilson', text: 'Hola Carlos! Encantado de conocerte.', time: '14:31' },
    ],
  },
  {
    id: 'room-3',
    title: 'French Salon: Philosophie, Littérature & Société Moderne',
    language: 'French',
    flag: '🇫🇷',
    cefrLevel: 'C1',
    levelLabel: 'Advanced C1',
    topicTag: 'Philosophy & Debate',
    activeSinceMinutes: 52,
    maxParticipants: 4,
    hasFreeSeats: false,
    isBeginnerFriendly: false,
    hasNativeSpeaker: true,
    isLive: true,
    participants: [
      {
        id: 'p-8',
        name: 'Camille Dupont',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        location: 'Paris, FR',
        nativeLanguage: 'French',
        learningLanguage: 'Japanese',
        cefrLevel: 'NATIVE',
        isHost: true,
        isSpeaking: true,
        isMuted: false,
        audioLevel: 80,
      },
      {
        id: 'p-9',
        name: 'Antoine Morel',
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
        location: 'Lyon, FR',
        nativeLanguage: 'French',
        learningLanguage: 'German',
        cefrLevel: 'NATIVE',
        isHost: false,
        isSpeaking: false,
        isMuted: false,
        audioLevel: 0,
      },
      {
        id: 'p-10',
        name: 'Elena Rostova',
        avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
        location: 'Geneva, CH',
        nativeLanguage: 'Russian',
        learningLanguage: 'French',
        cefrLevel: 'C1',
        isHost: false,
        isSpeaking: false,
        isMuted: false,
        audioLevel: 0,
      },
      {
        id: 'p-11',
        name: 'Julian Vance',
        avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
        location: 'Toronto, CA',
        nativeLanguage: 'English',
        learningLanguage: 'French',
        cefrLevel: 'C1',
        isHost: false,
        isSpeaking: false,
        isMuted: true,
        audioLevel: 0,
      },
    ],
    messages: [
      { id: 'm-31', sender: 'Camille Dupont', text: 'On discutait de l\'impact des nouveaux médias.', time: '14:10', isHost: true },
    ],
  },
  {
    id: 'room-4',
    title: 'Japanese Kanji & Anime Discussion: 日本語でアニメを語ろう！',
    language: 'Japanese',
    flag: '🇯🇵',
    cefrLevel: 'B2',
    levelLabel: 'Upper Intermediate',
    topicTag: 'Anime & Culture',
    activeSinceMinutes: 22,
    maxParticipants: 5,
    hasFreeSeats: true,
    isBeginnerFriendly: false,
    hasNativeSpeaker: true,
    isLive: true,
    participants: [
      {
        id: 'p-12',
        name: 'Yuki Takahashi',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
        location: 'Osaka, JP',
        nativeLanguage: 'Japanese',
        learningLanguage: 'English',
        cefrLevel: 'NATIVE',
        isHost: true,
        isSpeaking: true,
        isMuted: false,
        audioLevel: 70,
      },
      {
        id: 'p-13',
        name: 'Marcus Bell',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        location: 'Austin, TX',
        nativeLanguage: 'English',
        learningLanguage: 'Japanese',
        cefrLevel: 'B2',
        isHost: false,
        isSpeaking: false,
        isMuted: false,
        audioLevel: 0,
      },
    ],
    messages: [
      { id: 'm-41', sender: 'Yuki Takahashi', text: '今期のおすすめアニメは何ですか？', time: '14:35', isHost: true },
    ],
  },
  {
    id: 'room-5',
    title: 'German B2 Exam Prep: Goethe & telc Sprechen practice',
    language: 'German',
    flag: '🇩🇪',
    cefrLevel: 'B2',
    levelLabel: 'Exam Prep B2',
    topicTag: 'Exam Preparation',
    activeSinceMinutes: 44,
    maxParticipants: 4,
    hasFreeSeats: true,
    isBeginnerFriendly: false,
    hasNativeSpeaker: true,
    isLive: true,
    participants: [
      {
        id: 'p-14',
        name: 'Felix Weber',
        avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80',
        location: 'Munich, DE',
        nativeLanguage: 'German',
        learningLanguage: 'Italian',
        cefrLevel: 'NATIVE',
        isHost: true,
        isSpeaking: false,
        isMuted: false,
        audioLevel: 0,
      },
      {
        id: 'p-15',
        name: 'Daria Petrova',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        location: 'Vienna, AT',
        nativeLanguage: 'Russian',
        learningLanguage: 'German',
        cefrLevel: 'B2',
        isHost: false,
        isSpeaking: true,
        isMuted: false,
        audioLevel: 85,
      },
      {
        id: 'p-16',
        name: 'Lucas Silva',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
        location: 'Sao Paulo, BR',
        nativeLanguage: 'Portuguese',
        learningLanguage: 'German',
        cefrLevel: 'B2',
        isHost: false,
        isSpeaking: false,
        isMuted: false,
        audioLevel: 0,
      },
    ],
    messages: [
      { id: 'm-51', sender: 'Felix Weber', text: 'Teil 2: Ein Bild beschreiben und Vor-/Nachteile diskutieren.', time: '14:15', isHost: true },
    ],
  },
  {
    id: 'room-6',
    title: 'Korean K-Dramas & Everyday Slang: 한국어 프리토킹',
    language: 'Korean',
    flag: '🇰🇷',
    cefrLevel: 'ANY',
    levelLabel: 'All Levels Welcome',
    topicTag: 'Pop Culture & Slang',
    activeSinceMinutes: 19,
    maxParticipants: 6,
    hasFreeSeats: true,
    isBeginnerFriendly: true,
    hasNativeSpeaker: true,
    isLive: true,
    participants: [
      {
        id: 'p-17',
        name: 'Min-ji Park',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        location: 'Seoul, KR',
        nativeLanguage: 'Korean',
        learningLanguage: 'English',
        cefrLevel: 'NATIVE',
        isHost: true,
        isSpeaking: true,
        isMuted: false,
        audioLevel: 65,
      },
      {
        id: 'p-18',
        name: 'Chloe Evans',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        location: 'Sydney, AU',
        nativeLanguage: 'English',
        learningLanguage: 'Korean',
        cefrLevel: 'A2',
        isHost: false,
        isSpeaking: false,
        isMuted: false,
        audioLevel: 0,
      },
    ],
    messages: [
      { id: 'm-61', sender: 'Min-ji Park', text: '안녕하세요! 편하게 한국어로 이야기해봐요 :)', time: '14:40', isHost: true },
    ],
  },
];

export const LANGUAGES = [
  { code: 'all', name: 'All', count: 248, flag: '🌐' },
  { code: 'english', name: 'English', count: 142, flag: '🇬🇧' },
  { code: 'spanish', name: 'Spanish', count: 38, flag: '🇪🇸' },
  { code: 'french', name: 'French', count: 24, flag: '🇫🇷' },
  { code: 'german', name: 'German', count: 19, flag: '🇩🇪' },
  { code: 'japanese', name: 'Japanese', count: 15, flag: '🇯🇵' },
  { code: 'korean', name: 'Korean', count: 12, flag: '🇰🇷' },
  { code: 'chinese', name: 'Chinese', count: 11, flag: '🇨🇳' },
  { code: 'arabic', name: 'Arabic', count: 9, flag: '🇸🇦' },
  { code: 'russian', name: 'Russian', count: 8, flag: '🇷🇺' },
  { code: 'portuguese', name: 'Portuguese', count: 7, flag: '🇧🇷' },
  { code: 'italian', name: 'Italian', count: 5, flag: '🇮🇹' },
  { code: 'turkish', name: 'Turkish', count: 4, flag: '🇹🇷' },
  { code: 'hindi', name: 'Hindi', count: 3, flag: '🇮🇳' },
];

export const TOPIC_PROMPTS = [
  {
    category: 'Daily Life & Icebreakers',
    icon: 'coffee',
    prompts: [
      { title: 'What is the strangest food you have ever tasted?', level: 'Any', tag: 'Culture & Food' },
      { title: 'If you had to live in another country for a year, where would you go?', level: 'A2-B1', tag: 'Travel' },
      { title: 'Describe your perfect Sunday morning routine.', level: 'A1-A2', tag: 'Daily Routines' },
    ],
  },
  {
    category: 'Tech, AI & Future',
    icon: 'cpu',
    prompts: [
      { title: 'Will artificial intelligence replace language tutors, or empower them?', level: 'B2-C1', tag: 'AI & Future' },
      { title: 'What smartphone app has genuinely changed your life habits?', level: 'B1-B2', tag: 'Technology' },
      { title: 'Remote work vs In-office: What is the optimal balance?', level: 'B1-B2', tag: 'Work Culture' },
    ],
  },
  {
    category: 'Philosophy & Human Nature',
    icon: 'brain',
    prompts: [
      { title: 'Does learning another language change your personality?', level: 'B2-C2', tag: 'Psychology' },
      { title: 'Is it better to specialize in one skill or be a generalist?', level: 'B2-C1', tag: 'Philosophy' },
      { title: 'What cultural taboo from your country do foreigners often misunderstand?', level: 'C1-C2', tag: 'Anthropology' },
    ],
  },
];
