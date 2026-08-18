# bilalarikan.com

[www.bilalarikan.com](https://www.bilalarikan.com) sitesinin kaynağı.

Site, bir WordPress kurulumundan alınmış **statik HTML dökümüdür** ve GitHub Pages
üzerinden yayınlanır. Depoda çalışan bir backend, veritabanı ya da build adımı
yoktur — dosyalar olduğu gibi servis edilir.

## Yayın

| | |
|---|---|
| Barındırma | GitHub Pages (`main` dalı, kök dizin) |
| Alan adı | `www.bilalarikan.com` — `CNAME` dosyasıyla tanımlı |
| Build | Yok. `.nojekyll` sayesinde Jekyll işlemesi devre dışı, dosyalar doğrudan servis edilir |

`main` dalına push atmak yayına almak demektir.

## Dizin yapısı

```
.
├── index.html              Ana sayfa
├── 404.html                Hata sayfası (GitHub Pages otomatik servis eder)
├── CNAME                   Özel alan adı
├── robots.txt              Tarayıcı yönergeleri + sitemap işaretçisi
├── sitemap.xml             Arama motoru dizini (üretilen dosya)
├── <proje-adı>/            Her portfolyo yazısı kendi klasöründe (index.html + feed/)
├── category/  tag/  author/  Taksonomi sayfaları
├── feed/                   RSS beslemesi (index.xml)
├── wp-content/             Tema (gridzone), eklentiler ve görsel yüklemeleri
├── wp-includes/            Temanın ihtiyaç duyduğu jQuery / masonry / temel CSS
└── tools/                  Bakım betikleri (siteye dahil değildir)
```

## Bakım betikleri

Hepsi Python 3 ile çalışır, ek bağımlılık istemez ve **depo kökünden** çağrılır.
Dosya değiştiren iki betik (`clean-wp-artifacts.py`, `fix-feed-links.py`)
`--dry-run` ile yazmadan rapor verir.

| Betik | Ne yapar |
|---|---|
| `tools/check-links.py` | HTML içindeki tüm yerel `href`/`src`/`srcset`/`url()` hedeflerini tarar, var olmayan dosyaya işaret edenleri raporlar. Kırık hedef varsa çıkış kodu `1` döner |
| `tools/generate-sitemap.py` | `sitemap.xml` dosyasını yeniden üretir. `lastmod` değerini git geçmişinden alır |
| `tools/clean-wp-artifacts.py` | WordPress'e özgü ölü işaretlemeleri (emoji betiği, XML-RPC/pingback linkleri, REST keşif linkleri, yorum formu) HTML'den söker |
| `tools/fix-feed-links.py` | RSS keşif linklerini gerçek dosyaya (`feed/index.xml`) yönlendirir |
| `tools/convert-images-to-webp.py` | JPEG/PNG görselleri WebP'ye çevirir ve tüm referansları günceller. Favicon'lar PNG kalır; `foto.jpg` + `foto.png` gibi aynı gövdeli çiftlere dokunmaz; yalnızca çözümlenen yolu gerçekten dönüştürülen dosya olan referansları değiştirir |

Yeni bir WordPress dökümü alındığında sırasıyla çalıştırılması gereken akış:

```bash
python tools/clean-wp-artifacts.py
python tools/fix-feed-links.py
python tools/convert-images-to-webp.py    # Pillow gerekir, birkaç dakika sürer
python tools/generate-sitemap.py
python tools/check-links.py
```

## Notlar

- `wp-admin/`, `wp-json/`, `wp-login.php` ve `xmlrpc.php` bilinçli olarak
  depodan çıkarılmıştır: statik yayında hiçbir işlevleri yok, sadece ölü yüzey
  oluşturuyorlardı. `.gitignore` bunların geri dönmesini engeller.
- `wp-includes/` içinde yalnızca temanın gerçekten yüklediği dosyalar tutulur.
- Görseller WebP'ye çevrilmiştir (~103 MB → ~22 MB). Yeni görsel eklendiğinde
  `tools/convert-images-to-webp.py` yeniden çalıştırılabilir; yalnızca WebP'si
  gerçekten daha küçük olan dosyalar değiştirilir.
- Eski `.git` geçmişi hâlâ dönüştürülmemiş görselleri içerdiği için klonlama
  boyutu bu temizlikten etkilenmez; sadece yeni commit'ler küçüktür.
