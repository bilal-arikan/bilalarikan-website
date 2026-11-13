# Bilal Arikan portfolyosu

36 proje içeren statik portfolyo ve `pp-aggregator` veri kaynağı. Eski WordPress
dökümünün içerikleri ve yerel WebP görselleri korunarak site yeniden oluşturuldu.
Yeni arayüzde görsellerin doğal oranını koruyan, farklı yükseklikte kartlardan
oluşan Masonry düzeni bulunur. Ana katalog 1280 piksel ve üzerinde 5 sütundur;
daha dar ekranlarda sırasıyla 4, 3, 2 ve 1 sütuna iner. Koyu temada kategori
filtreleri, sıralama ve bağımsız proje sayfaları bulunur. Arama, liste görünümü
ve "Selected work" başlığı yoktur. JavaScript kapalıyken CSS sütunları kullanılır.
Proje adı, türü ve yılı görselin üzerindeki bilgi panelinde görünür.
YoutubeGlance kartında kırmızı tanıtım görselini kapatmamak için bilgi paneli
görselin altında yer alır. Güncel kapak, simge ve kullanım görseli
`wp-content/uploads/2026/09/youtubeglance-*.png` dosyalarındadır.
Yazılardaki görseller ayrı bir masonry galeride en fazla 3 sütunda gösterilir;
1024 piksel altında 2, 600 piksel altında 1 sütuna iner. "More to explore" bölümü yoktur.

## Yerelde çalıştırma

Windows 11, PowerShell, Node.js 22 veya üzeri ve Docker Desktop gereklidir.
İki depo aynı üst klasörde bulunmalıdır:

```text
Tion/
  bilalarikan-website/
  pp-aggregator/
```

Site klasöründen:

```powershell
& ..\pp-aggregator\tools\start-local.ps1
```

Betik bağımlılıkları kurar, siteyi üretip denetler ve dört Docker servisini açar.
Toplayıcının `.env` dosyası yoksa rastgele API anahtarı üretir; anahtarı ekrana
yazmaz. Mevcut `.env` dosyasını değiştirmez.

| Adres | İçerik |
| --- | --- |
| <http://localhost:4178> | Yeni portfolyo |
| <http://localhost:4178/api.json> | 36 projenin kaynak verisi |
| <http://localhost:8000/projects> | Birleştirilmiş proje listesi |
| <http://localhost:8000/projects/pocketbase-forge> | Tam içerikli proje detayı |
| <http://localhost:8000/sources> | Kaynakların son alınma zamanı ve güncelliği |

## İçerik düzenleme

| Dosya | Sorumluluk |
| --- | --- |
| `content/projects.json` | Proje isimleri, özetler, bağlantılar, tarihler ve temizlenmiş HTML |
| `content/site.json` | Profil, iletişim, kategori düzeni ve öne çıkan projeler |
| `content/pages.json` | Hakkında, iletişim, gizlilik ve diğer özgün sayfa içerikleri |
| `assets/` | Sorumluluklarına ayrılmış CSS ve tarayıcı davranışları |
| `assets/masonry.js`, `masonry.css` | Duyarlı sütun düzeni; filtre ve sıralama değişikliklerinde yeniden yerleşim |
| `assets/article-gallery.css`, `tools/lib/article-gallery.mjs` | Yazı görsellerinin 3 sütunlu galeriye aktarılması; açıklama ve bağlantıların korunması |
| `tools/lib/social.mjs` | Eski sitedeki sekiz profilin ortak alt bilgi alanında gösterilmesi |
| `tools/lib/render.mjs` | Sayfa şablonları |
| `tools/lib/card.mjs`, `media.mjs`, `html.mjs` | Proje kartları, gerçek görsel boyutları ve ortak HTML yardımcıları |
| `tools/build.mjs` | HTML sayfaları, `api.json`, sitemap ve `dist/` üretimi |

Değişiklikten sonra:

```powershell
npm run build
npm run check
```

Üretilen kök `index.html`, proje HTML dosyaları, `api.json` ve sitemap doğrudan
düzenlenmemelidir. Docker, `dist/` klasörünü salt okunur bağlar. Yeniden üretimden
sonra tarayıcı yenilenerek değişiklik görülebilir; toplayıcı yeni veriyi en geç
900 saniyelik eşitleme aralığında alır. Zorunlu yenileme için
[entegrasyon belgesine](../pp-aggregator/docs/BILALARIKAN.md) bakın.

Özgün tarih bulunmadığında veya yayın durumu bilinmediğinde ilgili alan `null`
kalır. Tarihler, mevcut yazıların tarihidir; projenin çıkış tarihi olarak
yorumlanmamalıdır. Öne çıkanların sırası, `site.json` üzerinden belirlenen
editoryal önceliktir. Hakkında sayfasındaki geçmiş biyografi arşiv notuyla korunur.
İletişim tablosundaki Mail-1 ve Zoom satırları kaldırılmıştır; diğer bilgiler korunur.
Sitedeki iletişim adresi `bilal1993arikan@gmail.com` olarak güncellenmiştir.
Eski Terms and Conditions içeriği korunur ve Privacy yanında bağlantısı bulunur.

## Denetleme

```powershell
npm run check
npm run test:browser
```

İlk komut JSON alanlarını, içerik eşleşmesini, HTML meta verilerini ve yeni
sayfaların yerel bağlantılarını denetler. İkincisi çalışan yerel siteye Chromium
ile bağlanır; koyu tema, filtreler, sıralama, eski arama/liste URL'lerinin uyumluluğu, görseller, detay
sayfaları, JavaScript kapalı görünüm ve 320/390/600/900/1100/1280/1440 piksel genişliklerini
kontrol eder. Chromium eksikse `npx playwright install chromium` çalıştırın.
Ekran görüntüleri Git dışında bırakılan `artifacts/` klasörüne yazılır.

Masonry, eski Gridzone temasındaki mevcut paket üzerinden kullanılır; derleme
lisans başlığıyla birlikte `assets/vendor/` altına kopyalar. Görsel boyutları
derleme sırasında ölçülüp HTML'e yazılır; yükleme sırasında kartlar sıçramaz.
Ana katalog sütun eşikleri: 1280/1024/768/480 piksel. Yazı galerisi eşikleri 1024/600 pikseldir.
Galeri üretimi API'deki yazı metnini değiştirmez; görsel sırası, açıklamalar,
sanatçı kredileri ve videolar içerik denetiminde karşılaştırılır.

## Yayın

Hedef ortam `212.108.107.194` VPS'si, SSH bağlantısı `myhermes` üzerinden
`100.101.118.70` adresidir. Site ortak Caddy üzerinden ayrı bir yayın klasöründen
sunulur. GitHub Pages'e ait `CNAME` ve `.nojekyll` dosyaları geçmiş uyumluluğu
için korunur; VPS yayını GitHub'a push gerektirmez.

```powershell
.\tools\deploy.ps1
```

Betik derler, denetler, sunucuya aktarır ve `current` bağlantısını atomik olarak
değiştirir. Önceki yayın korunur. DNS/TLS kurulumu, güncel geçiş durumu ve geri
alma adımları [yayın kılavuzundadır](deploy/YAYIN.md). Toplayıcı kurulumu
[entegrasyon belgesindedir](../pp-aggregator/docs/BILALARIKAN.md).

## Eski arşiv

Kategori, etiket, yazar ve RSS arşivleri eski biçimleriyle korunur. Proje
adresleri değişmez; eski `/drawings/` bağlantısı yeni çizim kategorisine gider.
Eski bakım araçları `tools/check-links.py`, `tools/find-orphans.py`,
`tools/convert-images-to-webp.py` ve `tools/markup_refs.py` içinde bulunur.
Tüm eski arşivi tarayan araçların kapsamı yeni `npm run check` kontrolünden geniştir.

`tools/import-legacy.mjs` yalnızca ilk WordPress aktarımı içindir. Var olan
`content/projects.json` dosyasının üzerine yazmaz; yeni üretilen HTML üzerinde
yeniden çalıştırılmamalıdır. `wp-admin`, PHP veya WordPress sunucusu gerekmez.
