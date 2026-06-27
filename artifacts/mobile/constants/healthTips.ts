import { Feather } from '@expo/vector-icons';

export type FeatherIcon = keyof typeof Feather.glyphMap;

export interface TipGroup {
  key: string;
  title: string;
  subtitle: string;
  icon: FeatherIcon;
  tips: string[];
}

export const PHASE_TIPS: Record<string, TipGroup> = {
  Menstruation: {
    key: 'Menstruation',
    title: 'Menstruation',
    subtitle: 'Rest and replenish while your body sheds its lining.',
    icon: 'droplet',
    tips: [
      'Prioritise rest and gentle movement like walking or stretching.',
      'Eat iron-rich foods such as leafy greens, beans, and lean red meat.',
      'Stay hydrated and use a warm compress to ease cramps.',
      'Be kind to yourself, lower energy right now is completely normal.',
    ],
  },
  Follicular: {
    key: 'Follicular',
    title: 'Follicular Phase',
    subtitle: 'Energy is rising as your body prepares to ovulate.',
    icon: 'sunrise',
    tips: [
      'A great window to start new workouts or tackle bigger tasks.',
      'Support rising estrogen with protein and fresh vegetables.',
      'Plan social plans and projects while motivation is high.',
      'Keep hydrating to support steady energy through the day.',
    ],
  },
  Ovulation: {
    key: 'Ovulation',
    title: 'Ovulation',
    subtitle: 'Your most fertile days of the cycle.',
    icon: 'heart',
    tips: [
      'This is your peak fertile window if you are trying to conceive.',
      'You may notice clearer, stretchy cervical fluid around now.',
      'Light to moderate exercise feels great during this phase.',
      'Stay hydrated and keep meals balanced to support energy.',
    ],
  },
  Luteal: {
    key: 'Luteal',
    title: 'Luteal Phase',
    subtitle: 'Wind down and support your body before your next period.',
    icon: 'moon',
    tips: [
      'Magnesium-rich foods like nuts and dark chocolate can ease PMS.',
      'Choose complex carbs to steady mood and energy.',
      'Prioritise sleep and gentle, restorative movement.',
      'Reduce caffeine and salt if you feel bloated or anxious.',
    ],
  },
  Unknown: {
    key: 'Unknown',
    title: 'Track Your Cycle',
    subtitle: 'Log a period start to unlock personalised guidance.',
    icon: 'calendar',
    tips: [
      'Tap "Log period start" on the cycle screen to begin tracking.',
      'Logging flow and symptoms helps predict your next period.',
      'The more you log, the more tailored your tips become.',
    ],
  },
};

export const TRIMESTER_TIPS: Record<number, TipGroup> = {
  1: {
    key: 'Trimester 1',
    title: 'First Trimester',
    subtitle: 'Your baby is forming quickly, focus on gentle nourishment.',
    icon: 'sunrise',
    tips: [
      'Take a prenatal vitamin with folic acid every day.',
      'Eat small, frequent meals to ease nausea, keep crackers nearby.',
      'Rest when you can, fatigue is very common right now.',
      'Sip water steadily and avoid alcohol and raw or undercooked foods.',
    ],
  },
  2: {
    key: 'Trimester 2',
    title: 'Second Trimester',
    subtitle: 'Often the most comfortable stretch, enjoy your energy.',
    icon: 'activity',
    tips: [
      'Stay active with walking, swimming, or prenatal yoga.',
      'Prioritise calcium and protein for your growing baby.',
      'Begin sleeping on your side, the left side is ideal.',
      'Moisturise your belly to soothe stretching skin.',
    ],
  },
  3: {
    key: 'Trimester 3',
    title: 'Third Trimester',
    subtitle: 'Preparing for birth, listen closely to your body.',
    icon: 'heart',
    tips: [
      'Monitor your baby\'s movements and report changes to your provider.',
      'Pack your hospital bag and finalise your birth plan.',
      'Practise pelvic floor and gentle breathing exercises.',
      'Watch for sudden swelling or severe headaches and call your provider.',
    ],
  },
};

export const SYMPTOM_TIPS: Record<string, string> = {
  cramps: 'For cramps, try a warm compress, gentle stretching, and magnesium-rich foods.',
  headache: 'For headaches, hydrate well, rest your eyes, and keep regular meals.',
  fatigue: 'For fatigue, prioritise sleep, iron-rich foods, and short restorative breaks.',
  bloating: 'For bloating, reduce salt, sip water, and favour potassium-rich foods.',
  acne: 'For hormonal acne, keep a gentle cleansing routine and avoid over-scrubbing.',
};
