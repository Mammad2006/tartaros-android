import { Language } from './types';

export const TRANSLATIONS: Record<
  Language,
  {
    character: string;
    inventory: string;
    skills: string;
    quests: string;
    map: string;
    shop: string;
    settings: string;
    close: string;
    equip: string;
    unequip: string;
    use: string;
    showAll: string;
    selectItemForSlot: string;
    emptySlotItems: string;
    attack: string;
    jump: string;
    dodge: string;
    talk: string;
    pickFlower: string;
    statsTitle: string;
    statTokens: string;
    skillTokens: string;
    fpsCap: string;
    graphics: string;
    bgmVolume: string;
    sfxVolume: string;
    language: string;
    exitConfirmTitle: string;
    exitConfirmBody: string;
    pauseBtn: string;
    resumeBtn: string;
    exitBtn: string;
    pausedOverlay: string;
    youDied: string;
    youDiedDesc: string;
    respawnBtn: string;
    day: string;
    night: string;
    clearWeather: string;
    rainWeather: string;
    snowWeather: string;
    low: string;
    medium: string;
    high: string;
    buyItem: string;
    sellItem: string;
    resetSave: string;
  }
> = {
  fa: {
    character: 'کاراکتر',
    inventory: 'کوله‌پشتی',
    skills: 'اسکیل‌ها',
    quests: 'ماموریت‌ها',
    map: 'نقشه',
    shop: 'فروشگاه',
    settings: 'تنظیمات',
    close: 'بستن',
    equip: 'تجهیز',
    unequip: 'غیرتجهیز کردن',
    use: 'مصرف',
    showAll: 'نمایش همه',
    selectItemForSlot: 'کدام آیتم را می‌خواهید تجهیز کنید؟',
    emptySlotItems: 'آیتمی برای این اسلات در کوله‌پشتی نیست.',
    attack: 'حمله',
    jump: 'پرش',
    dodge: 'جاخالی',
    talk: 'صحبت',
    pickFlower: 'چیدن گل درمانی',
    statsTitle: 'آمار قهرمان',
    statTokens: 'توکن آمار',
    skillTokens: 'توکن مهارت',
    fpsCap: 'فریم‌ریت (FPS)',
    graphics: 'کیفیت گرافیک',
    bgmVolume: 'صدای موسیقی پس‌زمینه',
    sfxVolume: 'صدای افکت‌ها',
    language: 'زبان بازی',
    exitConfirmTitle: 'خروج از بازی',
    exitConfirmBody: 'آیا از خروج از بازی مطمئن هستید؟ پیشرفت شما ذخیره شده است.',
    pauseBtn: 'توقف',
    resumeBtn: 'ادامه بازی',
    exitBtn: 'خروج',
    pausedOverlay: 'بازی متوقف شد',
    youDied: 'شما کشته شدید',
    youDiedDesc: 'قهرمان شما در نبرد سقوط کرد. برای ادامه به پایتخت آستاروت بازگردید.',
    respawnBtn: 'بازگشت به شهر آستاروت',
    day: 'روز',
    night: 'شب',
    clearWeather: 'صاف',
    rainWeather: 'بارانی',
    snowWeather: 'برفی',
    low: 'کم',
    medium: 'متوسط',
    high: 'بالا',
    buyItem: 'خرید آیتم',
    sellItem: 'فروش آیتم',
    resetSave: 'پاک کردن سیو و شروع جدید',
  },
  en: {
    character: 'Character',
    inventory: 'Inventory',
    skills: 'Skills',
    quests: 'Quests',
    map: 'Map',
    shop: 'Shop',
    settings: 'Settings',
    close: 'Close',
    equip: 'Equip',
    unequip: 'Unequip',
    use: 'Use',
    showAll: 'Show All',
    selectItemForSlot: 'Which item do you want to equip?',
    emptySlotItems: 'No matching items for this slot in bag.',
    attack: 'ATK',
    jump: 'Jump',
    dodge: 'Dodge',
    talk: 'Talk',
    pickFlower: 'Pick Healing Flower',
    statsTitle: 'Hero Stats',
    statTokens: 'Stat Tokens',
    skillTokens: 'Skill Tokens',
    fpsCap: 'Frame Rate (FPS)',
    graphics: 'Graphics Quality',
    bgmVolume: 'Music Volume',
    sfxVolume: 'SFX Volume',
    language: 'Language',
    exitConfirmTitle: 'Leave Game',
    exitConfirmBody: 'Are you sure you want to exit? Your progress is saved automatically.',
    pauseBtn: 'Pause',
    resumeBtn: 'Resume',
    exitBtn: 'Exit',
    pausedOverlay: 'Game Paused',
    youDied: 'You Were Slain',
    youDiedDesc: 'Your champion fell in battle. Return to Astarot Capital to continue.',
    respawnBtn: 'Return to Astarot Capital',
    day: 'Day',
    night: 'Night',
    clearWeather: 'Clear',
    rainWeather: 'Rain',
    snowWeather: 'Snow',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    buyItem: 'Buy Items',
    sellItem: 'Sell Items',
    resetSave: 'Reset Saved Game',
  },
};
