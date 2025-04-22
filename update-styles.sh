#!/bin/bash

# Stil güncellemelerini içeren bir geçici dosya oluştur
cat > temp-styles.sed << 'EOF'
# h1 stil güncellemeleri
s/h1 {[^}]*}/h1 {\n  font-size: 20px;\n  font-weight: 700; \/* Bold *\/\n  font-family: "Jura", sans-serif;\n  color: var(--black_800);\n  line-height: 1.3;\n}/g
s/\.h1 {[^}]*}/\.h1 {\n  font-size: 20px;\n  font-weight: 700; \/* Bold *\/\n  font-family: "Jura", sans-serif;\n}/g

# h2 stil güncellemeleri
s/h2 {[^}]*}/h2 {\n  font-size: 16px;\n  font-weight: 600; \/* Semi-Bold *\/\n  font-family: "Jura", sans-serif;\n  color: var(--black_800);\n  line-height: 1.3;\n}/g
s/\.h2 {[^}]*}/\.h2 {\n  font-size: 16px;\n  font-weight: 600; \/* Semi-Bold *\/\n  font-family: "Jura", sans-serif;\n}/g

# h3 stil güncellemeleri
s/h3 {[^}]*}/h3 {\n  font-size: 14px;\n  font-weight: 500; \/* Mid *\/\n  font-family: "Jura", sans-serif;\n  color: var(--black_800);\n  line-height: 1.3;\n}/g
s/\.h3 {[^}]*}/\.h3 {\n  font-size: 14px;\n  font-weight: 500; \/* Mid *\/\n  font-family: "Jura", sans-serif;\n}/g

# h4 stil güncellemeleri
s/h4 {[^}]*}/h4 {\n  font-size: 13px;\n  font-weight: 500; \/* Mid *\/\n  font-family: "Jura", sans-serif;\n  color: var(--black_800);\n  line-height: 1.3;\n}/g
s/\.h4 {[^}]*}/\.h4 {\n  font-size: 13px;\n  font-weight: 500; \/* Mid *\/\n  font-family: "Jura", sans-serif;\n}/g

# Paragraf stil güncellemeleri
s/p {[^}]*}/p {\n  color: var(--p_color);\n  font-family: "Inter", sans-serif;\n  font-weight: 300; \/* Light *\/\n  font-size: 11pt;\n}/g

# Video listesi başlıkları
s/\.video_list h3 {[^}]*}/\.video_list h3 {\n  font-size: 14px;\n  font-weight: 500; \/* Mid *\/\n  font-family: "Jura", sans-serif;\n  color: var(--black_800);\n  margin-bottom: 30px;\n}/g

# Card başlıkları
s/\.video_list \.video_list_inner \.card \.card-header button {[^}]*}/\.video_list \.video_list_inner \.card \.card-header button {\n  padding: 14px 35px;\n  font-size: 16px;\n  font-weight: 600; \/* Semi-Bold *\/\n  font-family: "Jura", sans-serif;\n  color: var(--black_800);\n  text-decoration: none;\n  margin-bottom: 0;\n  border: none;\n  outline: none;\n  text-transform: inherit;\n}/g

# Media body başlıkları
s/\.video_list \.video_list_inner \.card \.card-body \.nav li a \.media \.media-body h4 {[^}]*}/\.video_list \.video_list_inner \.card \.card-body \.nav li a \.media \.media-body h4 {\n  color: var(--black_800);\n  font-size: 13px;\n  font-weight: 500; \/* Mid *\/\n  font-family: "Jura", sans-serif;\n  margin-bottom: 3px;\n  transition: all 300ms linear 0s;\n}/g
EOF

# Stil dosyalarını güncelle
sed -i.bak -f temp-styles.sed css/style-main.css

# Yedek dosyayı kaldır
rm css/style-main.css.bak

# Geçici dosyayı kaldır
rm temp-styles.sed

echo "Stil güncellemeleri tamamlandı!" 