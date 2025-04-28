/**
 * doc_documentation_area başlık stillerini güncelleme script'i
 */
document.addEventListener("DOMContentLoaded", function() {
    // Stil değişiklikleri
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .doc_documentation_area .shortcode_title h1 {
            font-size: 23px !important;
            font-weight: 700 !important; /* Bold */
            font-family: "Jura", sans-serif !important;
            color: #d8ff08 !important;
            margin-bottom: 15px !important;
        }

        .doc_documentation_area .shortcode_title h2 {
            font-size: 18px !important;
            font-weight: 600 !important; /* Semi-Bold */
            font-family: "Jura", sans-serif !important;
            color: #d8ff08 !important;
            margin-bottom: 15px !important;
        }

        .doc_documentation_area .shortcode_title h3 {
            font-size: 16px !important;
            font-weight: 500 !important; /* Mid */
            font-family: "Jura", sans-serif !important;
            color: #d8ff08 !important;
            margin-bottom: 15px !important;
        }

        .doc_documentation_area .shortcode_title h4 {
            font-size: 15px !important;
            font-weight: 500 !important; /* Mid */
            font-family: "Jura", sans-serif !important;
            color: #d8ff08 !important;
            margin-bottom: 15px !important;
        }

        p {
            font-family: "Inter", sans-serif !important;
            font-weight: 300 !important; /* Light */
            font-size: 11pt !important;
        }
    `;
    document.head.appendChild(styleElement);
}); 