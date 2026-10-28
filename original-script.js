document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const outfitResult = document.getElementById('outfitResult');

    // 1. ТЕК "МЕНІҢ КАПСУЛАМДА" БАР КИІМДЕРДЕН ОБРАЗ ҚҰРАСТЫРУ
    if (generateBtn && outfitResult) {
        generateBtn.addEventListener('click', () => {
            const wardrobeCards = document.querySelectorAll('#wardrobeList .wardrobe-card');

            // Капсулада киім қалмаса немесе өшіріліп тасталса
            if (wardrobeCards.length === 0) {
                outfitResult.style.display = 'block';
                outfitResult.innerHTML = `
                    <div style="color: #c97a7a; font-weight: bold; text-align: center; padding: 10px;">
                        <i class="fa-solid fa-triangle-exclamation"></i> Капсулада киім жоқ! 
                    </div>
                `;
                return;
            }

            // Капсуладағы киімдерді категорияларға топтау
            const myWardrobe = {
                top: [],
                bottom: [],
                shoes: [],
                accessory: []
            };

            wardrobeCards.forEach(card => {
                const title = card.querySelector('.card-info h4')?.textContent.trim();
                const categoryText = card.querySelector('.card-info span')?.textContent.toLowerCase() || '';

                if (categoryText.includes('top')) {
                    myWardrobe.top.push(title);
                } else if (categoryText.includes('bottom')) {
                    myWardrobe.bottom.push(title);
                } else if (categoryText.includes('shoes')) {
                    myWardrobe.shoes.push(title);
                } else if (categoryText.includes('accessory')) {
                    myWardrobe.accessory.push(title);
                }
            });

            // Кездейсоқ таңдау функциясы
            const getRandomItem = (array) => {
                if (!array || array.length === 0) return null;
                return array[Math.floor(Math.random() * array.length)];
            };

            const selectedTop = getRandomItem(myWardrobe.top);
            const selectedBottom = getRandomItem(myWardrobe.bottom);
            const selectedShoes = getRandomItem(myWardrobe.shoes);
            const selectedAccessory = getRandomItem(myWardrobe.accessory);

            // Шығарылатын нәтиже
            outfitResult.style.display = 'block';
            outfitResult.innerHTML = `
                <h3 style="font-size: 0.95rem; margin-bottom: 10px;"><i class="fa-solid fa-sparkles"></i> Капсулаңыздан құрастырылған образ:</h3>
                <div class="outfit-items">
                    <div class="outfit-chip">
                        <i class="fa-solid fa-shirt"></i> 
                        <span><strong>Жоғарғы киім:</strong> ${selectedTop ? selectedTop : '<span style="color:#c97a7a;">Киім жоқ</span>'}</span>
                    </div>
                    <div class="outfit-chip">
                        <i class="fa-solid fa-user"></i> 
                        <span><strong>Төменгі киім:</strong> ${selectedBottom ? selectedBottom : '<span style="color:#c97a7a;">Киім жоқ</span>'}</span>
                    </div>
                    <div class="outfit-chip">
                        <i class="fa-solid fa-shoe-prints"></i> 
                        <span><strong>Аяқ киім:</strong> ${selectedShoes ? selectedShoes : '<span style="color:#c97a7a;">Киім жоқ</span>'}</span>
                    </div>
                    <div class="outfit-chip">
                        <i class="fa-solid fa-bag-shopping"></i> 
                        <span><strong>Аксессуар:</strong> ${selectedAccessory ? selectedAccessory : '<span style="color:#c97a7a;">Киім жоқ</span>'}</span>
                    </div>
                </div>
            `;
        });
    }

    // 2. КАПСУЛАДАН КИІМДІ ӨШІРУ БАТЫРМАСЫ
    document.querySelectorAll('.wardrobe-card .btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.currentTarget.closest('.wardrobe-card');
            if (card) card.remove();
        });
    });
});