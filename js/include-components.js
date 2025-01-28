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
                        remaining--;
                        
                        if (remaining === 0) {
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