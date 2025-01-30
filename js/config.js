// Merkezi yapılandırma ayarları
const config = {
    isDevelopment: true, // Geliştirme modu kontrolü (true/false)
    version: '1.0.0',
    environment: 'production', // 'development' veya 'production'
    security: {
        enableWatermark: true,
        enableCopyProtection: true,
        enableDevToolsDetection: true,
        enableExtensionDetection: true,
        enablePrintProtection: true,
        enableContextMenuProtection: true,
        enableDragProtection: true,
        enableSelectionProtection: true,
        enableKeyboardShortcuts: true
    }
};

// Config değerlerini global olarak dışa aktar
window.AppConfig = config; 