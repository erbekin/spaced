
1. Kullanıcı kaydı ve tokenler | tamam değil

  Kayıt Olma:
    Kullanıcılar kullanıcı adı ve şifre ve email ile kayıt olurlar.
    Kayıt olan kullanıcılara token çifti verilir.
    Kayıt olan kullanıcı ilk önce veritabanına eklenir.
    Ardından, kullanıcının oturumu oluşturulur.
    
  Giriş yapma:
    Daha önceden kayıt yapmış kullanıcılar kullanıcı adı ve şifre ile giriş
    yapabilirler.
    Mevcut halde refresh token var ise revoke edilir.
  Çıkış yapma:
    Çıkış yapmak için kullanıcının aktif bir oturumu olması gerekir.
    Çıkış yapıldığında aktif oturum silinir, eğer varsa diğer oturumlara dokunulmaz.
    Çıkış yapmak için
  Token Yenileme:
    Refresh token kurabiye kavanozunda tutulur. Kullanıcı tokenlerini yenileyebilir.
    Bir şart, refresh tokenin geçerli olmasıdır. Refresh tokenin imzasının doğruluğu
    yetmez. Veritabanından JTI kontrol edilir. Eğer  geçersizse (yok veya süresi
    dolmuş) işlem başarısız olur. 
  Access Token ile Yetkilendirme:
    Access token kısa ömürlüdür. 15 DK olarak belirlenmiştir. 
    Token, veriyükünde sadece 'sub' içerecek şekilde belirlenmiştir.
    Token HTTP isteklerinde Authorization standart başlığında Bearer olarak 
    gönderilecek şekilde belirlenmiştir.

  Token Hayatdöngüsü:
    Token Nedir:
      Tokenler JWT tokendir. HS256 algoritması kullanılacaktır.
      İki tokenli mekanizma kullanılacaktır.
      Bu mekanizmada, tokenlerden biri access diğeri refresh
      adını alır. İkisinin de farklı secretları vardır.
      Access token çoğunlukla kısa süre yaşar ve isteğin header'ında yer
      alır. Refresh token ise kavanozda saklanır ve uzun süre yaşar.
      Ayrıca Refresh tokenler identity ye sahiptir. Bu sayede
      veritabanı refresh tokenlerin takibini yapabilir ve manuel
      olarak onları geçersiz kılabilir. 
      İki tokenlerden yenileme işlemi ile yenilenebilir.
      Çıkış yapma durumunda refresh token revoke edilir.
      
    Tokenlerin oluşturulması:
      Tokenler 3 yerde oluşturulabilir.
        1. Kayıt olma
            Kullanıcı kayıt olurken başarılı yanıtın mutlaka access tokeni
            göndermesi, ve refresh tokeni de kurabiye kavanozuna eklemesi
            gerekmektedir. 
        2. Giriş yapma
            Giriş yapan kullanıcı,başarılı girişte token çifti alır. 
            Eğer kavanozda halihazırda refresh token varsa, sunucu
            veritabanından ilgili kayıdı siler. Yeni oturum database de oluşturulur
            ve oturumun idsi tokene yazılıp token imzalanır.
            İmzalanmış token kavanoza atılır.
        3. Yenileme
            Yenileme işlemi için kavanozda geçerli bir refresh token olmalıdır.
            Yenileme işlemi ile yeni bir access token oluşturulur ve refresh token
            kullanılır. Refresh tokenler bir kez kullanıldığında, ilgili oturum
            silinir, ve eski token artık geçersiz kalır. Bu güvenlidir, çünkü
            yeni token kavanoza atılır. Bu sayede, oturumun da süresi uzamış olur.

    AccessToken:
      Access tokenler,
        sub: kullanıcının id si.
        username: kullanıcının kullanıcı adı.
      içerir.
    RefreshToken:
      jti içerir. jti oturum id sini tutar (uuid).

    Oturumlar:
      JWT bazlı authentication kullanılır. Oturum refresh token ile takip edilir.
      Kullanıcı giriş yaptığında yeni oturum oluşturulur.
