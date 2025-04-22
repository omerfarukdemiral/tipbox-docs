/**
 * Legal Notice Popup Manager
 * 
 * Bu modül, sitede her kullanıcı için 1 kere görünen yasal uyarı popup'ını yönetir.
 * LocalStorage kullanarak kullanıcının onay durumunu saklar.
 */

(function() {
    // LocalStorage anahtarları
    const LEGAL_NOTICE_ACCEPTED_KEY = 'tipbox_legal_notice_accepted';
    
    // Dil çevirileri
    const translations = {
        tr: {
            title: 'Yasal Uyarı',
            content: 'Bu panel yalnızca davet edilen yatırımcılar tarafından erişilebilir ve içeriğindeki tüm bilgiler kesinlikle gizlidir. Tipbox Blueprint Panelindeki belgelerin, stratejik materyallerin veya finansal verilerin herhangi bir şekilde izinsiz kopyalanması, çoğaltılması, dağıtılması veya halka açık olarak paylaşılması kesinlikle yasaktır. Bu şartların ihlali, yasal işlem başlatılmasına neden olabilir.',
            checkboxLabel: 'Bildirimi anladım ve kabul ediyorum.',
            buttonText: 'Anladım'
        },
        en: {
            title: 'Legal Notice',
            content: 'This panel is accessible only to invited investors, and all content within is strictly confidential. Any unauthorized copying, reproduction, distribution, or public sharing of documents, strategic materials, or financial data presented in the Tipbox Blueprint Panel is strictly prohibited. Violation of these terms may result in legal action.',
            checkboxLabel: 'I understand the notice and I agree.',
            buttonText: 'OK, I Understand'
        }
    };
    
    // DOM yüklendikten sonra çalışacak fonksiyon
    document.addEventListener('DOMContentLoaded', function() {
        initLegalNotice();
    });

    /**
     * Yasal uyarı popup'ını başlatan ana fonksiyon
     */
    function initLegalNotice() {
        // Kullanıcı daha önce kabul ettiyse popup'ı gösterme
        if (hasUserAcceptedLegalNotice()) {
            return;
        }
        
        // Popup HTML'ini oluştur ve sayfaya ekle
        createLegalNoticePopup();
        
        // Popup'ı göster (kısa bir gecikme ile animasyon için)
        setTimeout(() => {
            const popup = document.querySelector('.legal-notice-popup');
            if (popup) {
                popup.classList.add('show');
            }
        }, 1000);
    }
    
    /**
     * Kullanıcının daha önce yasal uyarıyı kabul edip etmediğini kontrol eder
     * @returns {boolean} Kabul edildiyse true, aksi halde false
     */
    function hasUserAcceptedLegalNotice() {
        return localStorage.getItem(LEGAL_NOTICE_ACCEPTED_KEY) === 'true';
    }
    
    /**
     * Kullanıcının yasal uyarıyı kabul ettiğini kaydeder
     */
    function saveLegalNoticeAcceptance() {
        localStorage.setItem(LEGAL_NOTICE_ACCEPTED_KEY, 'true');
    }
    
    /**
     * Yasal uyarı popup'ını kapatır
     */
    function closeLegalNoticePopup() {
        const popup = document.querySelector('.legal-notice-popup');
        if (popup) {
            popup.classList.remove('show');
            
            // Animasyon tamamlandıktan sonra popup'ı DOM'dan kaldır
            setTimeout(() => {
                popup.remove();
            }, 400);
        }
    }
    
    /**
     * Geçerli dili algılar
     * @returns {string} Dil kodu ('tr' veya 'en')
     */
    function detectLanguage() {
        // HTML lang özniteliğini kontrol et
        const htmlLang = document.documentElement.lang;
        
        // Eğer lang özniteliği varsa ve desteklenen bir dilse onu kullan
        if (htmlLang && translations[htmlLang.toLowerCase().substring(0, 2)]) {
            return htmlLang.toLowerCase().substring(0, 2);
        }
        
        // Sayfada dil seçici elementleri kontrol et
        const langElements = document.querySelectorAll('.lang-selector .active, .language-switch .active');
        for (const elem of langElements) {
            const lang = elem.getAttribute('data-lang') || elem.textContent.trim().toLowerCase();
            if (lang && translations[lang.substring(0, 2)]) {
                return lang.substring(0, 2);
            }
        }
        
        // Varsayılan olarak Türkçe kullan
        return 'tr';
    }
    
    /**
     * Yasal uyarı popup HTML'ini oluşturur ve sayfaya ekler
     */
    function createLegalNoticePopup() {
        // Dili algıla
        const lang = detectLanguage();
        const text = translations[lang] || translations.tr;
        
        const popupHTML = `
            <div class="legal-notice-popup">
                <h4>${text.title}</h4>
                <p>${text.content}</p>
                <label>
                    <input type="checkbox" id="legal-notice-checkbox">
                    <span>${text.checkboxLabel}</span>
                </label>
                <button id="legal-notice-button" disabled>${text.buttonText}</button>
            </div>
        `;
        
        // Popup'ı body'nin sonuna ekle
        document.body.insertAdjacentHTML('beforeend', popupHTML);
        
        // Event listener'ları ekle
        setupEventListeners();
    }
    
    /**
     * Popup için olay dinleyicileri ekler
     */
    function setupEventListeners() {
        // Checkbox için event listener
        const checkbox = document.getElementById('legal-notice-checkbox');
        const acceptButton = document.getElementById('legal-notice-button');
        
        if (checkbox && acceptButton) {
            // Checkbox değişikliğini dinle
            checkbox.addEventListener('change', function() {
                acceptButton.disabled = !this.checked;
            });
            
            // Buton tıklamasını dinle
            acceptButton.addEventListener('click', function() {
                if (checkbox.checked) {
                    saveLegalNoticeAcceptance();
                    closeLegalNoticePopup();
                }
            });
        }
    }
    
    // initLegalNotice fonksiyonunu global olarak erişilebilir yap
    window.initLegalNotice = initLegalNotice;
})(); 