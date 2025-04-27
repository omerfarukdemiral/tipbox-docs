const fs = require('fs');
const path = require('path');

// Stil dosyasının yolu
const cssFilePath = path.join(__dirname, 'css', 'style-main.css');

// Stil dosyasını oku
let cssContent = fs.readFileSync(cssFilePath, 'utf8');

// Değişiklikler
const replacements = [
  // h1 stil güncellemeleri
  {
    pattern: /\.video_list h3 \{[^}]*\}/g,
    replacement: `.video_list h3 {
  font-size: 14px;
  font-weight: 500; /* Mid */
  font-family: "Jura", sans-serif;
  color: var(--black_800);
  margin-bottom: 30px;
}`
  },
  {
    pattern: /\.video_list \.video_list_inner \.card \.card-header button \{[^}]*\}/g,
    replacement: `.video_list .video_list_inner .card .card-header button {
  padding: 14px 35px;
  font-size: 16px;
  font-weight: 600; /* Semi-Bold */
  font-family: "Jura", sans-serif;
  color: var(--black_800);
  text-decoration: none;
  margin-bottom: 0;
  border: none;
  outline: none;
  text-transform: inherit;
}`
  },
  {
    pattern: /\.video_list \.video_list_inner \.card \.card-body \.nav li a \.media \.media-body h4 \{[^}]*\}/g,
    replacement: `.video_list .video_list_inner .card .card-body .nav li a .media .media-body h4 {
  color: var(--black_800);
  font-size: 13px;
  font-weight: 500; /* Mid */
  font-family: "Jura", sans-serif;
  margin-bottom: 3px;
  transition: all 300ms linear 0s;
}`
  },
  // Diğer başlık ve metin stillerinin güncellemeleri buraya eklenebilir
];

// Değişiklikleri uygula
replacements.forEach(({ pattern, replacement }) => {
  cssContent = cssContent.replace(pattern, replacement);
});

// Değiştirilmiş içeriği geri yaz
fs.writeFileSync(cssFilePath, cssContent, 'utf8');