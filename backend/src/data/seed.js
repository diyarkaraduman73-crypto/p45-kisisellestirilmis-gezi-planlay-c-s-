// Başlangıç (seed) verileri: ilgi alanları, şehirler ve örnek POI kataloğu.
// Veritabanı bağlı değilken API bu verilerle çalışır; scripts/initDb.js bunları veritabanına yükler.
// visit_minutes: önerilen ziyaret süresi (dk), price_level: 0 = ücretsiz ... 3 = pahalı

export const CITIES = [{ id: 1, name: 'İstanbul', country: 'Türkiye' }];

export const INTERESTS = [
  { slug: 'tarih', name: 'Tarih & Müze' },
  { slug: 'doga', name: 'Doğa & Park' },
  { slug: 'yemek', name: 'Yeme & İçme' },
  { slug: 'alisveris', name: 'Alışveriş' },
  { slug: 'sanat', name: 'Sanat & Kültür' },
  { slug: 'manzara', name: 'Manzara' },
  { slug: 'dini', name: 'Dini Yapılar' },
];

export const POIS = [
  { id: 1, name: 'Ayasofya', city: 'İstanbul', interest: 'tarih', lat: 41.0086, lng: 28.9802, visit_minutes: 75, price_level: 2, description: 'Bizans ve Osmanlı mimarisinin simgesi olan 6. yüzyıl yapısı.' },
  { id: 2, name: 'Sultanahmet Camii', city: 'İstanbul', interest: 'dini', lat: 41.0054, lng: 28.9768, visit_minutes: 45, price_level: 0, description: 'Mavi çinileriyle bilinen, altı minareli tarihi cami.' },
  { id: 3, name: 'Topkapı Sarayı', city: 'İstanbul', interest: 'tarih', lat: 41.0115, lng: 28.9834, visit_minutes: 150, price_level: 2, description: 'Osmanlı padişahlarının yaklaşık 400 yıl yaşadığı saray.' },
  { id: 4, name: 'Yerebatan Sarnıcı', city: 'İstanbul', interest: 'tarih', lat: 41.0084, lng: 28.9779, visit_minutes: 45, price_level: 2, description: 'Bizans döneminden kalma yeraltı su sarnıcı.' },
  { id: 5, name: 'Kapalıçarşı', city: 'İstanbul', interest: 'alisveris', lat: 41.0107, lng: 28.9681, visit_minutes: 90, price_level: 1, description: 'Dünyanın en eski ve büyük kapalı çarşılarından biri.' },
  { id: 6, name: 'Mısır Çarşısı', city: 'İstanbul', interest: 'alisveris', lat: 41.0165, lng: 28.9706, visit_minutes: 60, price_level: 1, description: 'Baharat, lokum ve kuruyemiş çarşısı.' },
  { id: 7, name: 'Süleymaniye Camii', city: 'İstanbul', interest: 'dini', lat: 41.0162, lng: 28.9640, visit_minutes: 45, price_level: 0, description: 'Mimar Sinan\'ın Haliç\'e bakan başyapıtı.' },
  { id: 8, name: 'Galata Kulesi', city: 'İstanbul', interest: 'manzara', lat: 41.0256, lng: 28.9742, visit_minutes: 60, price_level: 2, description: 'Şehrin 360 derece manzarasını sunan Ceneviz kulesi.' },
  { id: 9, name: 'İstiklal Caddesi', city: 'İstanbul', interest: 'alisveris', lat: 41.0340, lng: 28.9779, visit_minutes: 90, price_level: 1, description: 'Taksim\'den Tünel\'e uzanan canlı yaya caddesi.' },
  { id: 10, name: 'İstanbul Modern', city: 'İstanbul', interest: 'sanat', lat: 41.0268, lng: 28.9836, visit_minutes: 90, price_level: 2, description: 'Karaköy\'de çağdaş sanat müzesi.' },
  { id: 11, name: 'Pera Müzesi', city: 'İstanbul', interest: 'sanat', lat: 41.0317, lng: 28.9752, visit_minutes: 75, price_level: 1, description: '"Kaplumbağa Terbiyecisi" tablosuyla ünlü müze.' },
  { id: 12, name: 'Dolmabahçe Sarayı', city: 'İstanbul', interest: 'tarih', lat: 41.0391, lng: 29.0005, visit_minutes: 120, price_level: 2, description: 'Boğaz kıyısındaki 19. yüzyıl Osmanlı sarayı.' },
  { id: 13, name: 'Ortaköy', city: 'İstanbul', interest: 'yemek', lat: 41.0473, lng: 29.0270, visit_minutes: 60, price_level: 1, description: 'Kumpiri ve Boğaz kıyısındaki camisiyle meşhur semt.' },
  { id: 14, name: 'Yıldız Parkı', city: 'İstanbul', interest: 'doga', lat: 41.0490, lng: 29.0130, visit_minutes: 60, price_level: 0, description: 'Beşiktaş\'ta geniş, ağaçlık tarihi park.' },
  { id: 15, name: 'Emirgan Korusu', city: 'İstanbul', interest: 'doga', lat: 41.1085, lng: 29.0525, visit_minutes: 90, price_level: 0, description: 'Lale festivaliyle bilinen Boğaz korusu.' },
  { id: 16, name: 'Rumeli Hisarı', city: 'İstanbul', interest: 'tarih', lat: 41.0848, lng: 29.0563, visit_minutes: 60, price_level: 1, description: 'Fatih Sultan Mehmet\'in 1452\'de yaptırdığı hisar.' },
  { id: 17, name: 'Çamlıca Tepesi', city: 'İstanbul', interest: 'manzara', lat: 41.0277, lng: 29.0698, visit_minutes: 60, price_level: 0, description: 'Anadolu yakasının en yüksek seyir noktası.' },
  { id: 18, name: 'Kadıköy Çarşı', city: 'İstanbul', interest: 'yemek', lat: 40.9905, lng: 29.0257, visit_minutes: 90, price_level: 1, description: 'Esnaf lokantaları, balıkçılar ve kahveciler.' },
  { id: 19, name: 'Moda Sahili', city: 'İstanbul', interest: 'doga', lat: 40.9805, lng: 29.0270, visit_minutes: 60, price_level: 0, description: 'Gün batımı için sevilen sahil yürüyüş yolu.' },
  { id: 20, name: 'Kız Kulesi', city: 'İstanbul', interest: 'manzara', lat: 41.0211, lng: 29.0041, visit_minutes: 60, price_level: 2, description: 'Üsküdar açığındaki küçük adacıkta simge kule.' },
  { id: 21, name: 'Balat', city: 'İstanbul', interest: 'sanat', lat: 41.0294, lng: 28.9490, visit_minutes: 90, price_level: 0, description: 'Renkli evleri ve kafeleriyle tarihi semt.' },
  { id: 22, name: 'Karaköy Güllüoğlu', city: 'İstanbul', interest: 'yemek', lat: 41.0235, lng: 28.9783, visit_minutes: 30, price_level: 1, description: 'Klasik baklava durağı.' },
];
