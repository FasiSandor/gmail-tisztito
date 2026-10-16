# Gmail-tisztító / Mail Cleaner

Több Gmail-fiókot támogató, mobil-first alkalmazás a levelek kereséséhez, méretbecsléséhez és biztonságos Kukába helyezéséhez.

## Funkciók
- Legfeljebb négy Google-fiók egy munkamenetben
- Feladó, Gmail keresőoperátor, nagy és régi levelek
- Lapozható, 100 leveles vizsgálat összesített darabszámmal, becsült mérettel és feladói rangsorral
- Csillagozott és fontos levelek védelme, újraellenőrzése a művelet előtt
- Explicit megerősítés és Kukába mozgatás (nem végleges törlés)
- HttpOnly titkosított munkamenet; nincs szükség adatbázisra

## Google Cloud beállítás

1. Hozz létre Google Cloud projektet, kapcsold be a **Gmail API**-t.
2. Google Auth Platform → Branding / Audience: External / Testing, és vedd fel a saját Gmail-címeidet tesztfelhasználónak.
3. Data access: Gmail módosítási jogosultság: \`https://www.googleapis.com/auth/gmail.modify\`. Nyilvános terjesztéshez további Google-ellenőrzés szükséges lehet.
4. Clients → Create OAuth client → Web application.
5. Authorized redirect URI: \`https://A-TE-VERCEL-DOMAINED.vercel.app/api/callback\`.
6. A Vercel Environment Variables részen add meg:
   - \`GOOGLE_CLIENT_ID\`
   - \`GOOGLE_CLIENT_SECRET\`
   - \`SESSION_SECRET\` – véletlen szöveg, legalább 32 karakter
   - \`APP_URL\` – pl. \`https://gmail-tisztito.vercel.app\` (a tényleges pontos domain)
7. A környezeti változók megadása után indítható az éles alkalmazás. Soha ne töltsd fel a titkokat GitHubra.

## Fejlesztői ellenőrzés
\`\`\`bash
npm install
npm run typecheck
npm run build
\`\`\`

## Fontos korlátok
- A Gmail API által közölt \`sizeEstimate\` **becslés**, nem garantált Google Drive / Google One tárhelynyereség.
- Kukába helyezés után a tárhely csak a Kuka ürítésekor (esetleg késleltetéssel) szabadul fel.
- Nincs 2000-es összesített korlát. A felület 100 leveles lapokat kér le, a feldolgozás ideje és a Gmail API-kvóta nagy postafiókoknál jelentős lehet. A vizsgálati állapot az aktuális böngészőmunkamenetben tárolódik, és ennek tárhelykorlátja van.
- Nagy mennyiség feldolgozásakor serverless időkorlát léphet fel; ilyenkor kisebb keresési részhalmazokat használj.
- A Google OAuth Testing állapotú refresh tokenek lejárhatnak, ilyenkor újra kell csatlakoztatni a fiókot.
- A session tokenjei a **titkosított cookie-ban** tárolódnak, Gmail tartalom és melléklet nincs adatbázisba mentve.
- A fiók leválasztása helyi kapcsolateltávolítás, a Google-fiók engedélylistájáról nem vonja vissza az API-hozzáférést.
