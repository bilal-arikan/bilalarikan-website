# VPS yayın kılavuzu

## Ortam

- Genel IP: `212.108.107.194`; Tailscale: `100.101.118.70`.
- SSH: Windows kullanıcı ayarındaki `myhermes`, kullanıcı `hermes`.
- Site: `/var/www/bilalarikan/current`; sürümler: `/var/www/bilalarikan/releases/`.
- Önceki sürüm: `/var/www/bilalarikan/previous`.
- Ortak Caddy: `myhermes-caddy`; ayar: `/home/hermes/stack/caddy/Caddyfile`.
- Sadece `BILALARIKAN WEBSITE` işaretleri arasındaki blok bu projeye aittir.

## Geçiş durumu

28 Eylül 2026: YoutubeGlance kırmızı kapak ve kullanım görseli, ana sayfa kartı,
İngilizce açıklamalar ve Chrome Web Mağazası bağlantısı `20260928-231623`
sürümüyle yayınlandı. Önceki sürüm `20260915-000314` korunuyor. Genel HTTPS
üzerinden ana sayfa, proje sayfası, JSON, kart stili ve iki görsel `200` verdi.
Stil ve görseller yerel yayınla birebir eşleşti; JSON'daki mağaza bağlantısı
doğrulandı. DNS ve Caddy ayarları değiştirilmedi.

13 Eylül 2026: Kullanıcı onayıyla altı fazladan GitHub A kaydı silindi, kalan
iki kayıt VPS adresine güncellendi. Alan adı geçişi tamamlandı. Genel HTTPS
üzerinden ana sayfa, proje sayfası, yerleşim paketi, görsel, 34 projelik JSON
çıktısı ve gerçek 404 yanıtı doğrulandı. Kök alan adı `www` adresine `301` döner.

Etkin DNS kayıtları: `bilalarikan.com` ve `www.bilalarikan.com` için birer A
kaydı, içerik `212.108.107.194`, proxy açık, TTL otomatik. Diğer altı kayıt
korundu; toplam sekiz kayıt kaldı. Geçiş öncesi 14 kayıt
`dns-before-20260913.json` dosyasındadır. GitHub deposu veya içeriği silinmedi.

14 Eylül 2026: Farkındayım projesi `20260914-024825` sürümüyle yayınlandı.
Proje sayfası ve kapak görseli genel HTTPS üzerinden `200` döndü; JSON çıktısı
35 proje içeriyor. Toplayıcı yeni projeyi aldı. DNS ve ortak Caddy değiştirilmedi.

15 Eylül 2026: Vestel Smart Oven Interface projesi `20260915-000314` sürümüyle
yayınlandı. Proje sayfası ve kapak görseli genel HTTPS üzerinden `200` döndü;
YouTube videosu sayfada oynatıcıyla yükleniyor. JSON çıktısı 36 proje içeriyor.
Toplayıcı yeni projeyi periyodik eşitlemede aldı. DNS ve ortak Caddy
değiştirilmedi. `npm run test:browser`, neon sayfasındaki 800 piksel taşma
denetiminde duruyor. Aynı test önceki canlı sürümde de başarısız olduğundan bu
değişiklikten bağımsızdır; bu denetim en fazla 5 saniye beklenerek
çalıştırıldığında testin tamamı geçti.

## HTTPS

Cloudflare Origin CA sertifikası yalnızca kök alan adı ve `www` için üretildi;
son geçerlilik 9 Eylül 2041. Genel sertifika `origin.pem` dosyasıdır, gizli değildir.
Özel anahtar yalnızca sunucudaki `/var/www/.bilalarikan-tls/origin.key`
dosyasında, `600` izinleriyle bulunur. Bu klasör site kökünün dışındadır.
Özel anahtarı depoya veya yerel bilgisayara aktarmayın.

Zone'un mevcut TLS modu `Full` olarak gözlendi ve diğer alt alan adlarını
etkilememek için değiştirilmedi. Origin testinde sertifika zinciri ve alan adı
resmi CA ile ayrıca doğrulandı.

Cloudflare proxy açık tutulmalıdır. Origin CA tarayıcıların doğrudan güvendiği
bir sertifika değildir. Kontrol için [Cloudflare'ın resmi kök sertifikası](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/)
kullanılır; sertifika doğrulamasını kapatmak gerekmez.

## Yayınlama

Site klasöründe PowerShell:

```powershell
.\tools\deploy.ps1
```

Yayın kontrolü, sunucuya aktarılan proje sayısını yerelde doğrulanan JSON
çıktısıyla karşılaştırır; proje sayısı betikte sabit tutulmaz.

Ortak Caddy'deki yalnızca bu site bloğunu kurmak/güncellemek için:

```powershell
.\tools\deploy.ps1 -InstallCaddy
```

Kurulum önce Caddy ayarının yedeğini alır, dosyanın inode'unu korur, ayarı
doğrular ve kesintisiz yeniden yükler. Doğrulama/yükleme başarısızsa yedeği
geri koyar. Diğer Compose projeleri durdurulmaz. `wp-content` altındaki gerçek
portfolyo görsellerini engelleyen ortak WordPress tarama kuralı bu siteye uygulanmaz.

## Geri alma

Önce mevcut ve önceki yayın yolunu doğrulayın:

```powershell
ssh myhermes 'readlink /var/www/bilalarikan/current'
ssh myhermes 'readlink /var/www/bilalarikan/previous'
```

Sunucuda önceki sürüme dönmek için:

```bash
sudo ln -sfn "$(readlink /var/www/bilalarikan/previous)" /var/www/bilalarikan/rollback.next
sudo mv -Tf /var/www/bilalarikan/rollback.next /var/www/bilalarikan/current
```

İlk kurulum öncesi ortak Caddy yedeği:
`/home/hermes/stack/caddy/Caddyfile.before-bilalarikan-20260913-153257`.
Başka projeler sonradan değişmiş olabileceğinden bu dosyayı körlemesine geri
koymayın; sadece bu site bloğunu kaldırmak genellikle yeterlidir. DNS geri
alınacaksa kayıt yedeğindeki eski GitHub A adreslerini geri ekleyin.

## Kontroller

Yerelde `npm run check`; tarayıcı açıkken `npm run test:browser`.
İlk yayın origin kanıtı için `verify-origin.sh`, sunucuda resmi CA ile HTTPS,
JSON, medya ve 404 kontrolü yapar; ilk Caddy yedeğiyle de karşılaştırır.
Ortak Caddy başka bir proje tarafından değiştirilmişse bu tarihli karşılaştırma
başarısız olabilir; diğer projelerin değişikliklerini geri almayın.

Genel yayın sonrası `/`, `/api.json`, `/assets/masonry.js`, bir proje sayfası
ve bir görseli HTTPS üzerinden kontrol edin. Yanıtta `X-Portfolio-Origin:
bilalarikan-vps` yeni origin'i tanımlar. Kök alan adı `www` adresine yönlenir.

13 Eylül kontrolünde Tionport, Tion, Asterovia ve Namesight ana sayfaları
HTTPS üzerinden `200` döndürdü. Bu kontrol, uygulamaların tüm hesap içi
işlevlerinin sınandığı anlamına gelmez.
