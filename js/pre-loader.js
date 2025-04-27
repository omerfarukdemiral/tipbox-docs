(function ($) {
  "use strict";

  /*============= Modern preloader js =============*/
  $(window).on("load", function () {
    // Preloader kaldırılmadan önce biraz bekle
    setTimeout(function () {
      // Yükleme çubuğunu %100'e getir
      $(".loader-progress .bar").css({
        width: "100%",
        transition: "width 0.5s ease-in-out"
      });
      
      // Sonra preloader'ı kaldır
      setTimeout(function() {
        $("#preloader").fadeOut(500, function () {
          $("#preloader").remove();
        });
      }, 600);
    }, 700);
  });

  // Sayfa yüklenmeden önce animasyonu başlat
  $(document).ready(function() {
    // Preloader içindeki metin ve logo animasyonlarını başlat
    $(".loader-logo").addClass("animated");
    
    // İlerleme çubuğu animasyonunu başlat
    setTimeout(function() {
      $(".loader-progress .bar").css({
        width: "70%",
        transition: "width 2s ease-in-out"
      });
    }, 200);
  });
})(jQuery);
