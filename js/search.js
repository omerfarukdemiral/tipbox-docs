/**
 * Tipbox Arama İşlevselliği
 * pages.json içerisindeki verilere göre arama yapar ve sonuçları gösterir
 */

(function ($) {
  "use strict";

  // Global değişkenler
  let searchData = [];
  let isSearchDataLoaded = false;
  let searchTimeout;
  let searchPanel = null;
  let searchInput = null;

  // DOM yüklendikten sonra çalışacak fonksiyonlar
  $(document).ready(function () {
    initSearch();
  });

  /**
   * Arama işlevselliğini başlat
   */
  function initSearch() {
    searchInput = $("#searchbox");
    searchPanel = $(".header_search_form_panel");

    if (!searchInput.length) {
      console.warn("Arama kutusu bulunamadı.");
      return;
    }

    // Arama verilerini yükle
    loadSearchData();

    // Arama kutusuna yazı yazıldığında
    searchInput.on("input", function () {
      clearTimeout(searchTimeout);
      const searchTerm = $(this).val().trim();

      if (searchTerm.length >= 2) {
        searchTimeout = setTimeout(function () {
          performSearch(searchTerm);
        }, 300);
      } else {
        searchPanel.empty().slideUp(300);
      }
    });

    // Form submit işlemini engelle, bunun yerine arama yap
    $(".header_search_form").on("submit", function (e) {
      e.preventDefault();
      const searchTerm = searchInput.val().trim();
      if (searchTerm.length >= 2) {
        performSearch(searchTerm);
      }
    });

    // Arama butonuna tıklandığında
    $(".search-submit-btn").on("click", function (e) {
      e.preventDefault();
      const searchTerm = searchInput.val().trim();
      if (searchTerm.length >= 2) {
        performSearch(searchTerm);
      }
    });

    // Dokümana tıklandığında arama panelini kapat (arama kutusu ve arama paneli dışında bir yere tıklandıysa)
    $(document).on("click", function (e) {
      if (!$(e.target).closest(".header_search_form_info").length) {
        searchPanel.slideUp(300);
      }
    });
  }

  /**
   * Arama verilerini yükle
   */
  function loadSearchData() {
    $.ajax({
      url: window.location.href.includes('/pages/') ? '../data/pages.json' : 'data/pages.json',
      type: "GET",
      dataType: "json",
      success: function (data) {
        if (data && data.pages) {
          processSearchData(data.pages);
          isSearchDataLoaded = true;
        } else {
          console.error("pages.json içerisinde geçerli veri bulunamadı.");
        }
      },
      error: function (xhr, status, error) {
        console.error("Arama verileri yüklenirken hata oluştu:", error);
      }
    });
  }

  /**
   * Arama verilerini işle
   * @param {Array} pages - JSON verisi içerisindeki sayfalar dizisi
   */
  function processSearchData(pages) {
    searchData = [];
    
    // Sayfa konumuna göre baz URL belirle
    const basePath = window.location.href.includes('/pages/') ? '../' : '';

    // Her bir sayfa bölümünü işle
    pages.forEach(function (page) {
      const section = page.section;

      // Her bir başlık için
      page.heading1.forEach(function (heading) {
        // Ana başlık için ID oluştur
        const titleId = createIdFromTitle(heading.title);
        
        // Ana başlığı ekle - href'i olduğu gibi kullan
        searchData.push({
          section: section,
          title: heading.title,
          href: basePath + heading.href, // Doğrudan basePath + href kullan
          titleId: titleId,
          type: "main"
        });

        // Alt başlıkları ekle
        if (heading.sub && heading.sub.length > 0) {
          heading.sub.forEach(function (subTitle) {
            // Alt başlık için ID oluştur
            const subTitleId = createIdFromTitle(subTitle);
            
            // Alt başlıklar için ana href kullanılacak
            searchData.push({
              section: section,
              title: subTitle,
              mainTitle: heading.title,
              href: basePath + heading.href, // Doğrudan basePath + href kullan
              titleId: subTitleId, 
              type: "sub"
            });
          });
        }
      });
    });
  }

  /**
   * Başlıktan URL-güvenli ID oluştur
   * @param {string} title - Başlık metni
   * @returns {string} - URL-güvenli ID
   */
  function createIdFromTitle(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Özel karakterleri kaldır
      .replace(/\s+/g, '-') // Boşlukları tire ile değiştir
      .replace(/--+/g, '-') // Birden fazla tireyi tek tireye dönüştür
      .trim(); // Başındaki ve sonundaki boşlukları kaldır
  }

  /**
   * Arama işlemini gerçekleştir
   * @param {string} searchTerm - Arama terimi
   */
  function performSearch(searchTerm) {
    if (!isSearchDataLoaded) {
      searchPanel.html('<div class="search-loading">Arama verileri yükleniyor...</div>');
      searchPanel.slideDown(300);
      setTimeout(function () {
        performSearch(searchTerm);
      }, 500);
      return;
    }

    // Arama terimini küçük harfe çevir
    const term = searchTerm.toLowerCase().trim();
    
    // Arama terimi çok kısaysa arama yapma
    if (term.length < 2) {
      searchPanel.empty().slideUp(300);
      return;
    }

    // Farklı eşleşme türlerini ayrı dizilerde topla
    const exactMatches = []; // Tam eşleşenler
    const wordStartMatches = []; // Kelime başında eşleşenler
    const containsMatches = []; // İçerenler

    searchData.forEach(item => {
      const titleLower = item.title.toLowerCase();
      
      // Tam eşleşme
      if (titleLower === term) {
        exactMatches.push(item);
      }
      // Kelime başında eşleşme
      else if (titleLower.startsWith(term) || 
              titleLower.split(' ').some(word => word.startsWith(term))) {
        wordStartMatches.push(item);
      }
      // Kelime içinde eşleşme - ancak kelime başında değilse
      else if (titleLower.includes(term)) {
        containsMatches.push(item);
      }
    });

    // Öncelik sırasına göre birleştir
    const results = [
      ...exactMatches, 
      ...wordStartMatches,
      ...containsMatches
    ];

    // Sonuçları göster
    displaySearchResults(results);
  }

  /**
   * Arama sonuçlarını göster
   * @param {Array} results - Arama sonuçları
   */
  function displaySearchResults(results) {
    searchPanel.empty();

    if (results.length === 0) {
        searchPanel.html('<div class="search-no-results">No results found</div>');
        searchPanel.slideDown(300);
        return;
    }

    // Sonuç sayısını göster
    const resultCountHtml = `<div class="search-results-count">${results.length} results found</div>`;
    searchPanel.append(resultCountHtml);

    // Sonuçları göster (ilk 10 sonuç)
    const maxResults = Math.min(results.length, 10);
    for (let i = 0; i < maxResults; i++) {
        const result = results[i];
        const isSubItem = result.type === "sub";
        
        // Sonuç metnini oluştur
        let resultText = '';
        if (isSubItem) {
            resultText = `<strong>"${result.title}"</strong> content found in <strong>${capitalize(result.section)}</strong> page.`;
        } else {
            resultText = `<strong>"${result.title}"</strong> content found in <strong>${capitalize(result.section)}</strong> page.`;
        }
        
        let resultItemHtml = `
            <div class="search-results-item">
                <a href="${result.href}" class="search-result-link">
                    <div class="search-result-content">
                        <div class="search-result-text">${resultText}</div>
                        <div class="search-result-arrow">→</div>
                    </div>
                </a>
            </div>
        `;
        
        searchPanel.append(resultItemHtml);
    }

    // Sonuçları göster
    searchPanel.slideDown(300);
  }

  /**
   * Metindeki arama terimini vurgula (highlight)
   * @param {string} text - Orijinal metin
   * @param {string} term - Vurgulanacak terim
   * @returns {string} - Vurgulanmış HTML
   */
  function highlightText(text, term) {
    if (!term) return text;
    
    const regex = new RegExp('(' + escapeRegExp(term) + ')', 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
  }

  /**
   * RegExp için özel karakterleri escape et
   * @param {string} string - Escape edilecek metin
   * @returns {string} - Escape edilmiş metin
   */
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * İlk harfi büyük yap
   * @param {string} string - Metin
   * @returns {string} - İlk harfi büyük yapılmış metin
   */
  function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

})(jQuery); 