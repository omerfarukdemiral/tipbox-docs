// Component Include Function
function includeHTML() {
    return new Promise((resolve, reject) => {
        const elements = document.getElementsByTagName("*");
        let remaining = 0;
        
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const file = element.getAttribute("include-html");
            
            if (file) {
                remaining++;
                fetch(file)
                    .then(response => response.text())
                    .then(data => {
                        element.innerHTML = data;
                        element.removeAttribute("include-html");
                        
                        // İçe aktarılan HTML içindeki script'leri aktif et
                        const scripts = element.getElementsByTagName('script');
                        for (let j = 0; j < scripts.length; j++) {
                            const oldScript = scripts[j];
                            const newScript = document.createElement('script');
                            
                            // Script özelliklerini kopyala
                            Array.from(oldScript.attributes).forEach(attr => {
                                newScript.setAttribute(attr.name, attr.value);
                            });
                            
                            // Script içeriğini kopyala
                            newScript.textContent = oldScript.textContent;
                            
                            // Eski script'i yenisiyle değiştir
                            oldScript.parentNode.replaceChild(newScript, oldScript);
                        }
                        
                        remaining--;
                        if (remaining === 0) {
                            console.log("Tüm component'lar yüklendi ve script'ler aktif edildi");
                            resolve();
                        }
                    })
                    .catch(error => {
                        console.error("Component yükleme hatası:", error);
                        element.innerHTML = "Component Hatası";
                        remaining--;
                        if (remaining === 0) {
                            reject(error);
                        }
                    });
            }
        }
        
        if (remaining === 0) {
            resolve();
        }
    });
} 