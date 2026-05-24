# 🎬 IMDB Clone - Node.js Semestrální Práce

Aplikace pro recenzování filmů s webovým rozhraním, zabudovaným servem a real-time notifikacemi přes WebSocket.

## ✨ Funkce

- ✅ **Registrace a přihlášení** - Uživatelské účty s bcrypt hashováním hesel
- ✅ **Filmy** - Katalog filmů s detaily (název, rok, režisér, žánr)
- ✅ **Recenze** - Pouze přihlášení uživatelé mohou psát recenze (hodnocení 1-10)
- ✅ **Hlasování** - Uživatelé mohou hlasovat pro/proti recenzím (👍/👎)
- ✅ **Skore recenzí** - Automatické výpočty skóre recenzí na základě hlasů
- ✅ **Vyhledávání** - Vyhledávání filmů podle názvu, režiséra nebo žánru
- ✅ **WebSocket notifikace** - Real-time notifikace o nových recenzích
- ✅ **REST API** - Plně funkční REST API pro všechny operace
- ✅ **Testování** - Jest test suite pro testování databáze

## 🛠️ Technologie

- **Runtime**: Node.js (ESM moduly)
- **Server**: HTTP server (vestavěný)
- **Realtime**: WebSocket (ws modul)
- **Bezpečnost**: bcrypt pro hashování hesel
- **Databáze**: JSON (file-based)
- **Testování**: Jest
- **Frontend**: HTML5, CSS3, Vanilla JavaScript

## 📦 Instalace

```bash
# Naklonuje si repozitář
git clone <repository-url>
cd 4IT573_semestralni_prace

# Instalace závislostí
npm install
```

## 🚀 Spuštění

### Development mód s watch
```bash
npm run dev
```

### Normální spuštění
```bash
npm start
```

Server poběží na `http://localhost:3000`

## 🧪 Testování

```bash
npm test
```

Testy jsou umístěny v `tests/` složce a testují:
- Vytváření a načítání uživatelů
- Vyhledávání filmů
- Vytváření a správu recenzí
- Hlasování pro recenze
- Výpočty skóre

## 📝 API Endpointy

### Autentifikace

- `POST /api/register` - Registrace nového uživatele
- `POST /api/login` - Přihlášení uživatele
- `POST /api/logout` - Odhlášení uživatele
- `GET /api/me` - Získá informace o přihlášeném uživateli

### Filmy

- `GET /api/movies` - Seznám všech filmů
- `GET /api/movies/search?q=<query>` - Vyhledávání filmů
- `GET /api/movies/<id>` - Detail konkrétního filmu včetně recenzí

### Recenze

- `POST /api/reviews` - Vytvoření nové recenze (vyžaduje autentifikaci)
- `POST /api/reviews/<id>/vote` - Hlasování pro recenzi (👍 = 1, 👎 = -1)

### Statistiky

- `GET /api/stats` - Statistiky aplikace (počet uživatelů, filmů, recenzí)

## 📂 Struktura Projektu

```
.
├── public/
│   ├── index.html          # Hlavní stránka
│   ├── movie.html          # Detail filmu
│   ├── app.js              # Frontend logika
│   └── style.css           # Styly
├── server/
│   ├── server.js           # HTTP server + WebSocket
│   ├── db.js               # Databáze (JSON-based)
│   ├── utils.js            # Pomocné funkce
│   └── database.json       # Data (automaticky vygenerován)
├── tests/
│   ├── database.test.js    # Testy databáze
│   └── test-api.js         # Ruční API testy
├── jest.config.js          # Jest konfigurace
├── package.json            # Závislosti
└── .gitignore             # Git ignore rules
```

## 🔐 Bezpečnost

- Hesla jsou hashována s bcrypt (10 salts)
- Session ID je generován náhodně a uložen v paměti
- Cookies jsou nastaveny s HttpOnly flag
- Ověření přihlášení je vyžadováno pro citlivé operace

## 📊 Ukázková Data

Při prvním spuštění se databáze automaticky vytvoří s 5 klasickými filmy:
1. The Shawshank Redemption (1994)
2. The Godfather (1972)
3. The Dark Knight (2008)
4. Pulp Fiction (1994)
5. Inception (2010)

## 🌐 WebSocket Notifikace

Server pošle notifikaci když:
- Nová recenze je přidána - `{ type: 'new_review', movieId, username }`
- Recenze je hlasována - `{ type: 'review_voted', reviewId }`

## 📱 Frontend

Aplikace má responzivní UI s:
- Zobrazením seznamu filmů s posuvným oknem
- Vyhledáváním v reálném čase
- Modálními okny pro přihlášení/registraci
- Detailním pohledem na film s recenzemi
- Možností psát a hlasovat pro recenze (když je uživatel přihlášen)

## 🚨 Poznámky

- Databáze se automaticky ukládá na disk po každé změně
- WebSocket připojení je otevřeno pro real-time notifikace
- Frontend je vanilla JavaScript (bez frameworků)
- Server slušně zpracovává chyby s HTML error responses

## 📄 Licence

ISC

---

**Autor**: David  
**Vytvořeno**: 2026  
**Předmět**: 4IT573 - Semestrální Práce
