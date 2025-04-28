/**
 * TipBox Arama İşlevselliği
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
    displaySearchResults(results, term);
  }

  /**
   * Arama sonuçlarını göster
   * @param {Array} results - Arama sonuçları
   * @param {string} searchTerm - Arama terimi
   */
  function displaySearchResults(results, searchTerm) {
    searchPanel.empty();

    if (results.length === 0) {
      searchPanel.html('<div class="search-no-results">No results found.</div>');
      searchPanel.slideDown(300);
      return;
    }

    // Sonuç sayısını göster
    const resultCountHtml = `<div class="search-results-count">${results.length} results found</div>`;
    searchPanel.append(resultCountHtml);

    // Sonuçları listele
    const resultsListHtml = $('<ul class="search-results-list"></ul>');

    // En fazla 10 sonuç göster
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
        <li>
          <a href="${result.href}" class="search-result-link">
            <div class="search-result-content">
              <span class="search-result-text">${resultText}</span>
              <span class="search-result-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
            </div>
          </a>
        </li>
      `;
      
      resultsListHtml.append(resultItemHtml);
    }

    searchPanel.append(resultsListHtml);

    // Daha fazla sonuç varsa "Tümünü Göster" butonu ekle
    if (results.length > 10) {
      const showAllHtml = `
        <div class="search-show-all">
          <a href="#" id="show-all-results">View all ${results.length} results</a>
        </div>
      `;
      searchPanel.append(showAllHtml);

      // Tümünü göster butonuna tıklandığında
      $("#show-all-results").on("click", function (e) {
        e.preventDefault();
        displayAllSearchResults(results, searchTerm);
      });
    }

    // Sonuçları göster
    searchPanel.slideDown(300);
  }

  /**
   * Tüm arama sonuçlarını göster
   * @param {Array} results - Arama sonuçları
   * @param {string} searchTerm - Arama terimi
   */
  function displayAllSearchResults(results, searchTerm) {
    // Overlay oluştur
    const overlay = $('<div class="search-results-overlay"></div>');
    const closeButton = $('<button class="search-results-close">&times;</button>');
    const resultsContainer = $('<div class="search-results-container"></div>');
    
    const resultCountHtml = `<h3 class="search-results-title">${results.length} results for "${searchTerm}"</h3>`;
    resultsContainer.append(resultCountHtml);
    
    const resultsListHtml = $('<ul class="search-results-list full"></ul>');
    
    // Tüm sonuçları göster
    results.forEach(function (result) {
      const isSubItem = result.type === "sub";
      
      // Sonuç metnini oluştur
      let resultText = '';
      if (isSubItem) {
        resultText = `<strong>"${result.title}"</strong> content found in <strong>${capitalize(result.section)}</strong> page.`;
      } else {
        resultText = `<strong>"${result.title}"</strong> content found in <strong>${capitalize(result.section)}</strong> page.`;
      }
      
      let resultItemHtml = `
        <li>
          <a href="${result.href}" class="search-result-link">
            <div class="search-result-content">
              <span class="search-result-text">${resultText}</span>
              <span class="search-result-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
            </div>
          </a>
        </li>
      `;
      
      resultsListHtml.append(resultItemHtml);
    });
    
    resultsContainer.append(resultsListHtml);
    overlay.append(closeButton).append(resultsContainer);
    $("body").append(overlay).addClass("search-overlay-active");
    
    // Overlay'i göster
    overlay.fadeIn(300);
    
    // Kapatma butonuna tıklandığında overlay'i kaldır
    closeButton.on("click", function () {
      overlay.fadeOut(300, function () {
        overlay.remove();
        $("body").removeClass("search-overlay-active");
      });
    });
    
    // Escape tuşuna basıldığında da kapat
    $(document).on("keydown.searchOverlay", function (e) {
      if (e.key === "Escape") {
        closeButton.trigger("click");
      }
    });
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