export type Lang = "ru" | "tk" | "en";

export type MediaItem =
  | { kind: "video"; src: string; poster: string | null; still: boolean }
  | { kind: "img"; src: string; caption: "photo" | "vms" | "chapar" };

export interface Section {
  id: string; no: string; icon: string;
  code: string; short: string; title: string; body: string; feats: string[];
  media?: MediaItem[];
}
export interface Content {
  brandFull: string; tagline: string; heroKicker: string; heroSub: string; heroScroll: string;
  marquee: string[];
  nav: { about: string; services: string; process: string; contact: string };
  aboutCode: string; aboutTitle: string; aboutBody: string;
  stats: string[][];
  servicesCode: string; servicesTitle: string; servicesSub: string; more: string; mediaSoon: string;
  sections: Section[];
  processCode: string; processTitle: string; process: string[][];
  advCode: string; advTitle: string; adv: string[][];
  contactCode: string; contactTitle: string; contactSub: string; catalogCta: string;
  lbl: { addr: string; phone: string; email: string };
  capVideo: string; capPhoto: string; close: string; play: string;
  contact: { addr: string; phone: string; email: string; legal: string };
}

// media per section: video stems (/assets/video/<v>.mp4 + /assets/img/<v>-poster.jpg)
// and photo names (/assets/img/<p>.jpg)
// `still` lists video stems that must NOT autoplay inline (e.g. low-fps source that
// strobes) — shown as a static poster, still playable in the lightbox.
export const MEDIA: Record<
  string,
  { videos: string[]; photos: string[]; still?: string[] }
> = {
  skud: { videos: ["s1-1", "s1-2", "s1-3"], photos: [] },
  faceid: { videos: [], photos: ["faceid-1", "faceid-2", "faceid-3"] },
  cctv: { videos: [], photos: ["cctv-4", "cctv-1", "cctv-3", "cctv-2"] },
  lan: { videos: [], photos: ["lan-1", "lan-2", "lan-3"] },
  fire: { videos: ["s3-1", "s3-2", "s3-3", "s3-4"], photos: ["fire-p1", "fire-p2", "fire-p4", "fire-p6"], still: ["s3-3"] },
  climate: { videos: [], photos: ["ac-1", "ac-2", "ac-3", "ac-4"] },
  barrier: { videos: ["s2-1"], photos: ["s2-photo1", "s2-photo2"] },
  programming: { videos: [], photos: ["cctv-vms", "prog-1", "prog-2"] },
};

export const ICONS: Record<string, string> = {
  access: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.3"/>',
  faceid: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M9 10v1M15 10v1M9.5 14.5c1.2 1 3.8 1 5 0"/>',
  camera: '<path d="M3 8.5A1.5 1.5 0 0 1 4.5 7H14a1.5 1.5 0 0 1 1.5 1.5V16a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 16z"/><path d="M15.5 11l4.5-2.2v7.4L15.5 14"/><circle cx="8" cy="12" r="2.2"/>',
  network: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v3M6 16v-2.5h12V16"/>',
  fire: '<path d="M12 3c1 3 4 4 4 8a4 4 0 1 1-8 0c0-2 1-3 2-4 0 2 2 2 2 4"/>',
  climate: '<rect x="3" y="5" width="18" height="7" rx="2"/><path d="M6 8.5h7"/><path d="M7 15c0 1.2 1 1.2 1 2.4M12 15c0 1.2 1 1.2 1 2.4M17 15c0 1.2 1 1.2 1 2.4"/>',
  barrier: '<path d="M4 20V10M4 10l16-4M4 13l16-4M4 16l13-3"/><circle cx="4" cy="20" r="1.4"/>',
  cycle: '<path d="M4 12a8 8 0 0 1 14-5m2-2v4h-4M20 12a8 8 0 0 1-14 5m-2 2v-4h4"/>',
  team: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 6a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6"/>',
  cert: '<path d="M7 4h10v12l-5-3-5 3z"/><circle cx="12" cy="9" r="2.2"/>',
  shield: '<path d="M12 3l7 3v6c0 5-3 7-7 9-4-2-7-4-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
  code: '<path d="M9 7l-5 5 5 5M15 7l5 5-5 5"/>',
  download: '<path d="M12 4v11M8 11l4 4 4-4"/><path d="M5 19h14"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>',
  moon: '<path d="M20 14.5A8.2 8.2 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
};

const PHONE = "+993 65 55 55 68";
const EMAIL = "kanagatlymahabat@gmail.com";

export const CONTENT: Record<Lang, Content> = {
  ru: {
    brandFull: "Kanagatly Mahabat",
    tagline: "Системы безопасности и автоматизации",
    heroKicker: "Инжиниринг · Монтаж · Программирование",
    heroSub: "Проектируем, монтируем и программируем системы безопасности, связи и автоматизации — контроль доступа, видеонаблюдение, сети, пожарная сигнализация и климат. Под ключ.",
    heroScroll: "Листайте вниз",
    marquee: ["СКУД", "FACE ID", "ВИДЕОНАБЛЮДЕНИЕ", "ЛВС / СЕТИ", "ОХРАННО-ПОЖАРНАЯ", "КОНДИЦИОНЕРЫ", "ШЛАГБАУМЫ", "ПРОГРАММИРОВАНИЕ"],
    nav: { about: "О компании", services: "Услуги", process: "Процесс", contact: "Контакты" },
    aboutCode: "О КОМПАНИИ",
    aboutTitle: "Инженерные решения для безопасности и автоматизации объектов",
    aboutBody: "KM (Kanagatly Mahabat) — компания, выполняющая полный спектр слаботочных и инженерных работ: контроль доступа и распознавание лиц, видеонаблюдение, прокладку офисных сетей, охранно-пожарную сигнализацию, кондиционирование и автоматизацию. Мы реализуем проекты «под ключ» — от обследования объекта и проектирования до монтажа, программирования, пусконаладки и сервисного обслуживания.",
    stats: [["{services}", "направлений работ"], ["Под ключ", "полный цикл"], ["Гарантия", "на оборудование и монтаж"], ["Сервис", "техническая поддержка"]],
    servicesCode: "НАШИ УСЛУГИ", servicesTitle: "Все системы — под ключ",
    servicesSub: "Каждое направление выполняем отдельно или комплексно.",
    more: "Подробнее", mediaSoon: "Материалы добавляются",
    sections: [
      { id: "skud", no: "001", icon: "access", code: "СКУД", short: "СКУД", title: "Системы контроля доступа (СКУД)", body: "Проектирование и монтаж систем контроля и управления доступом: турникеты, электронные замки, контроллеры и считыватели. Гибкая настройка прав, учёт рабочего времени, журналирование и интеграция с распознаванием лиц.", feats: ["Турникеты, электронные замки, контроллеры", "Карты, PIN-коды и биометрия", "Учёт рабочего времени и журнал событий", "Гибкая настройка прав доступа"] },
      { id: "faceid", no: "002", icon: "faceid", code: "FACE ID", short: "Face ID", title: "Распознавание лиц (Face ID)", body: "Установка и настройка терминалов распознавания лиц для бесконтактного и быстрого прохода. Высокая точность идентификации, защита от подделки и интеграция в общую систему контроля доступа.", feats: ["Бесконтактный проход по лицу", "Высокая скорость и точность", "Защита от подделки (anti-spoofing)", "Интеграция со СКУД и турникетами"] },
      { id: "cctv", no: "003", icon: "camera", code: "ВИДЕОНАБЛЮДЕНИЕ", short: "Видеонаблюдение", title: "Видеонаблюдение и камеры", body: "Проектирование и монтаж систем видеонаблюдения: IP- и аналоговые камеры, видеорегистраторы, настройка записи и удалённого доступа. Контроль территории и помещений в реальном времени.", feats: ["IP- и аналоговые камеры", "Запись и архив видео", "Удалённый доступ со смартфона", "Аналитика и детекция движения"] },
      { id: "lan", no: "004", icon: "network", code: "ЛВС / СЕТИ", short: "Офисные сети", title: "Офисные локальные сети (ЛВС)", body: "Прокладка и пусконаладочные работы офисных локальных сетей. Монтаж кабельных трасс, патч-панелей и серверных шкафов, тестирование и сертификация линий, настройка активного оборудования.", feats: ["Прокладка СКС и кабельных трасс", "Монтаж патч-панелей и серверных шкафов", "Тестирование и сертификация линий", "Настройка коммутаторов и Wi-Fi"] },
      { id: "fire", no: "005", icon: "fire", code: "ОХРАННО-ПОЖАРНАЯ", short: "Сигнализация", title: "Охранно-пожарная сигнализация", body: "Установка, подключение и программирование систем охранной и пожарной сигнализации. Монтаж извещателей и шлейфов, настройка приёмно-контрольных приборов, оповещение и управление эвакуацией.", feats: ["Дымовые, тепловые и охранные извещатели", "Прокладка шлейфов и монтаж ПКП", "Программирование под конкретный объект", "Оповещение и управление эвакуацией"] },
      { id: "climate", no: "006", icon: "climate", code: "КОНДИЦИОНЕРЫ", short: "Климат", title: "Кондиционеры и климатические системы", body: "Установка, подключение и программирование систем кондиционирования и климат-контроля. Настройка режимов работы, диспетчеризация и интеграция в системы автоматизации здания.", feats: ["Монтаж и подключение кондиционеров", "Программирование режимов работы", "Диспетчеризация и автоматизация", "Сервис и обслуживание"] },
      { id: "barrier", no: "007", icon: "barrier", code: "ШЛАГБАУМЫ", short: "Шлагбаумы", title: "Шлагбаумы и дорожные датчики", body: "Монтаж автоматических шлагбаумов и дорожных датчиков для организации въезда и контроля транспортных потоков. Индукционные петли и датчики присутствия обеспечивают автоматическую работу и интеграцию с распознаванием номеров.", feats: ["Автоматические шлагбаумы для въезда", "Индукционные петли и датчики присутствия", "Защита от опускания на автомобиль", "Интеграция с распознаванием номеров"] },
      { id: "programming", no: "008", icon: "code", code: "ПРОГРАММИРОВАНИЕ", short: "Программирование", title: "Программирование и разработка ПО", body: "Программируем и настраиваем оборудование систем безопасности — видеорегистраторы и камеры Dahua, контроллеры СКУД, пожарные панели и климатические системы. Также разрабатываем собственное программное обеспечение: мобильные приложения, backend и интеграции. Примеры проектов — собственная система видеонаблюдения Kanagatly VMS и курьерская платформа Chapar Express (приложение курьера, карты, рейсы, баланс, REST API).", feats: ["Программирование оборудования Dahua (NVR, камеры, СКУД)", "Настройка пожарных панелей и контроллеров", "Разработка мобильных приложений и backend", "Интеграция систем, API и автоматизация"] },
    ],
    processCode: "КАК МЫ РАБОТАЕМ", processTitle: "Полный цикл работ",
    process: [["01", "Обследование объекта"], ["02", "Проектирование"], ["03", "Поставка оборудования"], ["04", "Монтаж и прокладка"], ["05", "Программирование и пусконаладка"], ["06", "Сервисное обслуживание"]],
    advCode: "ПОЧЕМУ KM — KANAGATLY MAHABAT", advTitle: "Наши преимущества",
    adv: [["cycle", "Полный цикл «под ключ»", "От обследования объекта до сервисного обслуживания."], ["team", "Опытная инженерная команда", "Специалисты по слаботочным, сетевым и пожарным системам."], ["cert", "Сертифицированное оборудование", "Надёжные компоненты проверенных производителей."], ["shield", "Гарантия и поддержка", "Гарантия на работы и оперативный сервис."]],
    contactCode: "СВЯЗАТЬСЯ С НАМИ", contactTitle: "Обсудим ваш проект",
    contactSub: "Оставьте заявку — подберём решение под ваш объект.",
    catalogCta: "Скачать каталог (PDF)",
    lbl: { addr: "Адрес", phone: "Телефон", email: "Email" },
    capVideo: "Видео", capPhoto: "Фото", close: "Закрыть", play: "Смотреть",
    contact: { addr: "г. Ашхабад, ул. Московская", phone: PHONE, email: EMAIL, legal: "Kanagatly Mahabat" },
  },
  tk: {
    brandFull: "Kanagatly Mahabat",
    tagline: "Howpsuzlyk we awtomatlaşdyryş ulgamlary",
    heroKicker: "Inžiniring · Gurnama · Programmirleme",
    heroSub: "Howpsuzlyk, aragatnaşyk we awtomatlaşdyryş ulgamlaryny taslaýarys, gurýarys we programmirleýäris — giriş gözegçiligi, wideogözegçilik, ulgamlar, ýangyn duýduryşy we klimat. Açar bilen.",
    heroScroll: "Aşak aýlaň",
    marquee: ["СКУД", "FACE ID", "WIDEOGÖZEGÇILIK", "ÝERLI ULGAMLAR", "GORAG-ÝANGYN", "KONDISIONERLER", "ŞLAGBAUMLAR", "PROGRAMMIRLEME"],
    nav: { about: "Kompaniýa", services: "Hyzmatlar", process: "Proses", contact: "Habarlaşmak" },
    aboutCode: "KOMPANIÝA HAKDA",
    aboutTitle: "Desgalaryň howpsuzlygy we awtomatlaşdyrylyşy üçin inžener çözgütleri",
    aboutBody: "KM (Kanagatly Mahabat) — pes woltly we inžener işleriniň doly toplumyny ýerine ýetirýän kompaniýa: giriş gözegçiligi we ýüz tanamak, wideogözegçilik, ofis ulgamlaryny çekmek, gorag-ýangyn duýduryşy, kondisionerleme we awtomatlaşdyryş. Biz taslamalary «açar bilen» durmuşa geçirýäris — desgany barlamakdan we taslamakdan başlap, gurnama, programmirleme, işe goýbermek we hyzmat etmäge çenli.",
    stats: [["{services}", "iş ugry"], ["Açar bilen", "doly aýlaw"], ["Kepillik", "enjama we gurnama"], ["Hyzmat", "tehniki goldaw"]],
    servicesCode: "HYZMATLARYMYZ", servicesTitle: "Ähli ulgamlar — açar bilen",
    servicesSub: "Her ugry aýratyn ýa-da toplumlaýyn ýerine ýetirýäris.",
    more: "Giňişleýin", mediaSoon: "Materiallar goşulýar",
    sections: [
      { id: "skud", no: "001", icon: "access", code: "СКУД", short: "СКУД", title: "Giriş gözegçilik ulgamlary (СКУД)", body: "Giriş gözegçiligi we dolandyryş ulgamlaryny taslamak we gurnamak: turniketler, elektron gulplar, kontrollerler we okaýjylar. Hukuklary çeýe sazlamak, iş wagtyny hasaba almak, ýazga geçirmek we ýüz tanamak bilen birleşdirmek.", feats: ["Turniketler, elektron gulplar, kontrollerler", "Kartlar, PIN-kodlar we biometrika", "Iş wagtyny hasaba almak we waka žurnaly", "Giriş hukuklaryny çeýe sazlamak"] },
      { id: "faceid", no: "002", icon: "faceid", code: "FACE ID", short: "Face ID", title: "Ýüz tanamak (Face ID)", body: "Galtaşyksyz we çalt geçmek üçin ýüz tanamak terminallaryny gurnamak we sazlamak. Ýokary takyklyk, galplyga garşy gorag we umumy giriş gözegçilik ulgamyna birleşdirmek.", feats: ["Ýüz boýunça galtaşyksyz geçiş", "Ýokary tizlik we takyklyk", "Galplyga garşy gorag (anti-spoofing)", "СКУД we turniketler bilen birleşmek"] },
      { id: "cctv", no: "003", icon: "camera", code: "WIDEOGÖZEGÇILIK", short: "Wideogözegçilik", title: "Wideogözegçilik we kameralar", body: "Wideogözegçilik ulgamlaryny taslamak we gurnamak: IP we analog kameralar, wideoýazgy enjamlary, ýazgyny we uzakdan girişi sazlamak. Çäkleri we jaýlary hakyky wagtda gözegçilik.", feats: ["IP we analog kameralar", "Wideo ýazgy we arhiw", "Smartfondan uzakdan giriş", "Hereket kesgitlemesi we analitika"] },
      { id: "lan", no: "004", icon: "network", code: "ÝERLI ULGAMLAR", short: "Ofis ulgamlary", title: "Ofis ýerli ulgamlary (ЛВС)", body: "Ofis ýerli ulgamlaryny çekmek we işe goýbermek işleri. Kabel ýollaryny, patç-panellerini we serwer şkaflaryny gurnamak, liniýalary barlamak we sertifikatlaşdyrmak, işjeň enjamlary sazlamak.", feats: ["СКС we kabel ýollaryny çekmek", "Patç-panel we serwer şkaflaryny gurnamak", "Liniýalary barlamak we sertifikatlaşdyrmak", "Kommutatorlary we Wi-Fi sazlamak"] },
      { id: "fire", no: "005", icon: "fire", code: "GORAG-ÝANGYN", short: "Duýduryş", title: "Gorag-ýangyn duýduryş ulgamlary", body: "Gorag we ýangyn duýduryş ulgamlaryny gurnamak, birikdirmek we programmirlemek. Duýdurçylary we şleýflary gurnamak, kabul ediş-gözegçilik enjamlaryny sazlamak, duýdurmak we ewakuasiýany dolandyrmak.", feats: ["Tüsse, ýylylyk we gorag duýdurçylary", "Şleýflary çekmek we ПКП gurnamak", "Her desga üçin programmirlemek", "Duýdurmak we ewakuasiýany dolandyrmak"] },
      { id: "climate", no: "006", icon: "climate", code: "KONDISIONERLER", short: "Klimat", title: "Kondisionerler we klimat ulgamlary", body: "Kondisionerleme we klimat-gözegçilik ulgamlaryny gurnamak, birikdirmek we programmirlemek. Iş tertiplerini sazlamak, dispetçerleşdirmek we jaýy awtomatlaşdyryş ulgamlaryna birleşdirmek.", feats: ["Kondisionerleri gurnamak we birikdirmek", "Iş tertiplerini programmirlemek", "Dispetçerleşdirmek we awtomatlaşdyrmak", "Hyzmat we abatlaýyş"] },
      { id: "barrier", no: "007", icon: "barrier", code: "ŞLAGBAUMLAR", short: "Şlagbaumlar", title: "Şlagbaumlar we ýol datçikleri", body: "Awtoulag akymlaryny dolandyrmak we girişi guramak üçin awtomatik şlagbaumlary hem-de ýol datçiklerini gurnamak. Induksion halkalar we barlyk datçikleri awtomatik işlemegi we belgi tanamak bilen birleşmegi üpjün edýär.", feats: ["Giriş üçin awtomatik şlagbaumlar", "Induksion halkalar we barlyk datçikleri", "Awtoulagyň üstüne düşmekden goramak", "Belgi tanamak bilen birleşmek"] },
      { id: "programming", no: "008", icon: "code", code: "PROGRAMMIRLEME", short: "Programmirleme", title: "Programmirleme we programma üpjünçiligi", body: "Howpsuzlyk ulgamlarynyň enjamlaryny programmirleýäris we sazlaýarys — Dahua wideoýazgy enjamlary we kameralar, СКУД kontrollerler, ýangyn panelleri we klimat ulgamlary. Şeýle-de öz programma üpjünçiligimizi taýýarlaýarys: mobil goşundylar, backend we integrasiýalar. Taslamalaryň mysallary — öz wideogözegçilik ulgamymyz Kanagatly VMS we Chapar Express kuriýer platformasy (kuriýer goşundysy, kartalar, reýsler, balans, REST API).", feats: ["Dahua enjamlaryny programmirlemek (NVR, kamera, СКУД)", "Ýangyn panellerini we kontrollerleri sazlamak", "Mobil goşundylary we backend taýýarlamak", "Ulgamlaryň integrasiýasy, API we awtomatlaşdyrmak"] },
    ],
    processCode: "BIZ NÄHILI IŞLEÝÄRIS", processTitle: "Doly iş aýlawy",
    process: [["01", "Desgany barlamak"], ["02", "Taslamak"], ["03", "Enjam getirmek"], ["04", "Gurnamak we çekmek"], ["05", "Programmirlemek we işe goýbermek"], ["06", "Hyzmat etmek"]],
    advCode: "NÄME ÜÇIN KM — KANAGATLY MAHABAT", advTitle: "Artykmaçlyklarymyz",
    adv: [["cycle", "Doly «açar bilen» aýlaw", "Desgany barlamakdan hyzmat etmäge çenli."], ["team", "Tejribeli inžener topary", "Pes woltly, ulgam we ýangyn ulgamlary boýunça hünärmenler."], ["cert", "Sertifikatlaşdyrylan enjamlar", "Ynamdar öndürijileriň ygtybarly komponentleri."], ["shield", "Kepillik we goldaw", "Işlere kepillik we çalt hyzmat."]],
    contactCode: "BIZ BILEN HABARLAŞYŇ", contactTitle: "Taslamaňyzy maslahatlaşalyň",
    contactSub: "Arza galdyryň — desgaňyz üçin çözgüt saýlarys.",
    catalogCta: "Katalogy ýüklemek (PDF)",
    lbl: { addr: "Salgy", phone: "Telefon", email: "Email" },
    capVideo: "Wideo", capPhoto: "Surat", close: "Ýap", play: "Görmek",
    contact: { addr: "Aşgabat ş., Moskowskaýa köç.", phone: PHONE, email: EMAIL, legal: "Kanagatly Mahabat" },
  },
  en: {
    brandFull: "Kanagatly Mahabat",
    tagline: "Security & automation systems",
    heroKicker: "Engineering · Installation · Programming",
    heroSub: "We design, install and program security, networking and automation systems — access control, video surveillance, networks, fire alarms and climate. Turnkey.",
    heroScroll: "Scroll down",
    marquee: ["ACCESS CONTROL", "FACE ID", "CCTV", "NETWORKS / LAN", "FIRE & SECURITY", "AIR CONDITIONING", "BARRIERS", "PROGRAMMING"],
    nav: { about: "Company", services: "Services", process: "Process", contact: "Contacts" },
    aboutCode: "ABOUT US",
    aboutTitle: "Engineering solutions for facility security and automation",
    aboutBody: "KM (Kanagatly Mahabat) is a company delivering the full range of low-voltage and engineering works: access control and face recognition, video surveillance, office network cabling, fire & security alarms, air conditioning and automation. We deliver turnkey projects — from site survey and design to installation, programming, commissioning and maintenance.",
    stats: [["{services}", "areas of work"], ["Turnkey", "full cycle"], ["Warranty", "on equipment & installation"], ["Service", "technical support"]],
    servicesCode: "OUR SERVICES", servicesTitle: "All systems — turnkey",
    servicesSub: "We deliver each area separately or as a complete solution.",
    more: "Details", mediaSoon: "Materials coming soon",
    sections: [
      { id: "skud", no: "001", icon: "access", code: "ACCESS CONTROL", short: "Access control", title: "Access control systems (ACS)", body: "Design and installation of access control and management systems: turnstiles, electronic locks, controllers and readers. Flexible rights management, time & attendance, event logging and integration with face recognition.", feats: ["Turnstiles, electronic locks, controllers", "Cards, PIN codes and biometrics", "Time & attendance and event log", "Flexible access-rights setup"] },
      { id: "faceid", no: "002", icon: "faceid", code: "FACE ID", short: "Face ID", title: "Face recognition (Face ID)", body: "Installation and setup of face-recognition terminals for fast, contactless entry. High identification accuracy, anti-spoofing protection and integration into the overall access-control system.", feats: ["Contactless face-based entry", "High speed and accuracy", "Anti-spoofing protection", "Integration with ACS and turnstiles"] },
      { id: "cctv", no: "003", icon: "camera", code: "CCTV", short: "Video surveillance", title: "Video surveillance & cameras", body: "Design and installation of video-surveillance systems: IP and analog cameras, recorders, recording and remote-access setup. Real-time monitoring of premises and grounds.", feats: ["IP and analog cameras", "Recording and video archive", "Remote access from your phone", "Analytics and motion detection"] },
      { id: "lan", no: "004", icon: "network", code: "NETWORKS / LAN", short: "Office networks", title: "Office local networks (LAN)", body: "Cabling and commissioning of office local networks. Installation of cable trays, patch panels and server racks, line testing and certification, active-equipment setup.", feats: ["Structured cabling and trays", "Patch panels and server racks", "Line testing and certification", "Switch and Wi-Fi setup"] },
      { id: "fire", no: "005", icon: "fire", code: "FIRE & SECURITY", short: "Alarms", title: "Fire & security alarm systems", body: "Installation, connection and programming of fire and security alarm systems. Mounting detectors and loops, configuring control panels, alerting and evacuation control.", feats: ["Smoke, heat and security detectors", "Loop wiring and control-panel mounting", "Programming for each facility", "Alerting and evacuation control"] },
      { id: "climate", no: "006", icon: "climate", code: "AIR CONDITIONING", short: "Climate", title: "Air conditioning & climate systems", body: "Installation, connection and programming of air-conditioning and climate-control systems. Operating-mode setup, dispatching and integration into building automation.", feats: ["AC installation and connection", "Operating-mode programming", "Dispatching and automation", "Service and maintenance"] },
      { id: "barrier", no: "007", icon: "barrier", code: "BARRIERS", short: "Barriers", title: "Barriers & road sensors", body: "Installation of automatic barriers and road sensors to manage entry and traffic flow. Induction loops and presence sensors provide automatic operation and integration with license-plate recognition.", feats: ["Automatic entry barriers", "Induction loops and presence sensors", "Anti-drop vehicle protection", "License-plate recognition integration"] },
      { id: "programming", no: "008", icon: "code", code: "PROGRAMMING", short: "Programming", title: "Programming & software development", body: "We program and configure security-system equipment — Dahua recorders and cameras, ACS controllers, fire panels and climate systems. We also develop our own software: mobile apps, backends and integrations. Project examples — our own Kanagatly VMS video-management system and the Chapar Express courier platform (courier app, maps, flights, balance, REST API).", feats: ["Dahua equipment programming (NVR, cameras, ACS)", "Fire panel and controller setup", "Mobile app and backend development", "System integration, APIs and automation"] },
    ],
    processCode: "HOW WE WORK", processTitle: "Full project cycle",
    process: [["01", "Site survey"], ["02", "Design"], ["03", "Equipment supply"], ["04", "Installation & cabling"], ["05", "Programming & commissioning"], ["06", "Maintenance"]],
    advCode: "WHY KM — KANAGATLY MAHABAT", advTitle: "Our advantages",
    adv: [["cycle", "Full turnkey cycle", "From site survey to ongoing maintenance."], ["team", "Experienced engineering team", "Specialists in low-voltage, network and fire systems."], ["cert", "Certified equipment", "Reliable components from trusted manufacturers."], ["shield", "Warranty & support", "Workmanship warranty and prompt service."]],
    contactCode: "GET IN TOUCH", contactTitle: "Let's discuss your project",
    contactSub: "Leave a request — we'll find a solution for your facility.",
    catalogCta: "Download catalog (PDF)",
    lbl: { addr: "Address", phone: "Phone", email: "Email" },
    capVideo: "Video", capPhoto: "Photo", close: "Close", play: "Watch",
    contact: { addr: "Ashgabat, Moskovskaya St.", phone: PHONE, email: EMAIL, legal: "Kanagatly Mahabat" },
  },
};

export function captionFor(name: string, c: Content): string {
  if (name.startsWith("prog")) return "Chapar Express";
  if (name.startsWith("cctv-vms")) return "Kanagatly VMS";
  return c.capPhoto;
}
