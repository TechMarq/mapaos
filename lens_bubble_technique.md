# Técnica: Glassmorphic Lens Tab Selector (Indicador de Lente Glassmórfica com Efeito Gelatina)

Este documento descreve como recriar o efeito de **Lente Física Glassmórfica** para seletores de abas e menus, contendo distorção cromática (arco-íris nas bordas), zoom de lupa no elemento ativo e física elástica (*squash & stretch*) de movimento.

---

## 1. Estrutura HTML
O contêiner pai deve ter posicionamento relativo para que a bolha (indicador) se mova de forma livre em segundo plano (`z-0`). As abas ou botões ficam acima dela (`z-10`).

```html
<div class="relative flex gap-3 mb-6" id="tabs-container">
    <!-- A Bolha Seletora (Indicador Absoluto) -->
    <div id="tabs-indicator" class="absolute lens-bubble rounded-xl transition-all duration-300 ease-out z-0" style="height: 0px; top: 0px; left: 0px; width: 0px; will-change: transform, left, width;"></div>
    
    <!-- Botões / Abas -->
    <button class="tab-btn active" onclick="switchTab(this)">Aba 1</button>
    <button class="tab-btn" onclick="switchTab(this)">Aba 2</button>
</div>
```

---

## 2. Estilização CSS
O segredo do visual físico é o uso de desfoque de fundo (`backdrop-filter`) somado a sombras internas coloridas (`inset`) em tons opostos do espectro (Magenta e Ciano) para criar a refração prismática/aberração cromática das bordas.

```css
/* Estilo Base dos Botões */
.tab-btn {
    padding: 8px 20px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    position: relative;
    z-index: 10;
    background: transparent !important;
    border: none !important;
    transition: color 0.3s, transform 0.3s;
    transform: scale(1);
}

/* Efeito Lupa (Zoom na Aba Selecionada) */
.tab-btn.active {
    color: #ffffff !important;
    text-shadow: 0 0 8px rgba(173, 198, 255, 0.4);
    transform: scale(1.15) !important; /* Zoom sutil */
}

.tab-btn:not(.active) {
    color: #c1c6d7 !important;
}

.tab-btn:not(.active):hover {
    color: #ffffff !important;
}

/* A Bolha de Vidro Física (Lens Bubble) */
.lens-bubble {
    background: rgba(255, 255, 255, 0.05) !important;
    backdrop-filter: blur(12px) saturate(1.8) !important;
    -webkit-backdrop-filter: blur(12px) saturate(1.8) !important;
    border: 1.5px solid rgba(255, 255, 255, 0.18) !important;
    box-shadow: 
        inset 0 4px 6px rgba(255, 255, 255, 0.25),   /* Brilho de topo */
        inset -3px -3px 8px rgba(167, 139, 250, 0.5), /* Roxo/Violeta pastel claro */
        inset 3px 3px 8px rgba(110, 231, 183, 0.5),   /* Verde pastel claro */
        inset 0 0 10px rgba(173, 198, 255, 0.3),      /* Azul pastel claro */
        0 8px 24px rgba(0, 0, 0, 0.5) !important;    /* Sombra de profundidade */
}
```

---

## 3. Lógica JavaScript (Movimento e Física Gelatina)
Quando o usuário clica em uma aba, calculamos a distância e direção do movimento para aplicar o efeito *Squash & Stretch* (esticar no sentido da corrida e achatar na altura) e resetamos a forma após a transição finalizar.

```javascript
function updateTabsIndicator(activeBtn) {
    const indicator = document.getElementById('tabs-indicator');
    if (!indicator) return;

    const rect = activeBtn.getBoundingClientRect();
    const containerRect = activeBtn.parentElement.getBoundingClientRect();
    
    const currentLeft = parseFloat(indicator.dataset.lastLeft) || 0;
    const targetLeft = rect.left - containerRect.left;
    const dist = Math.abs(targetLeft - currentLeft);
    
    // Se houver movimento relevante, ativa a física de bolha elástica
    if (dist > 5) {
        // Estica horizontalmente (scaleX) e achata verticalmente (scaleY)
        indicator.style.transform = `scaleX(1.18) scaleY(0.82)`;
        
        // Define o ponto de origem do estiramento com base na direção
        indicator.style.transformOrigin = targetLeft > currentLeft ? 'left center' : 'right center';
    }

    // Aplica novas coordenadas
    indicator.style.left = `${targetLeft}px`;
    indicator.style.width = `${rect.width}px`;
    indicator.style.height = `${rect.height}px`;
    indicator.style.top = `${rect.top - containerRect.top}px`;
    indicator.dataset.lastLeft = targetLeft;
    
    // Reseta o estiramento ao formato original após a animação terminar (250ms)
    clearTimeout(indicator.timeoutId);
    indicator.timeoutId = setTimeout(() => {
        indicator.style.transform = 'scaleX(1) scaleY(1)';
    }, 250);
}
```

---

## Prompt Pronto para Replicar (Copie e Cole para outras AIs/Desenvolvedores):

> *"Quero criar um menu/seletor de abas dinâmico. O fundo ativo deve ser um indicador absoluto em formato de bolha de vidro translúcida (Glassmorphism + Backdrop Blur). A bolha deve ter um contorno de aberração cromática (sombras internas rosa/magenta à esquerda e ciano/azul à direita simulando refração de lente física). Quando eu mudar de aba, a bolha deve se mover com física elástica (Jelly animation / Squash & Stretch), esticando temporariamente no sentido do movimento e voltando ao normal ao chegar no destino. Além disso, o botão ativo que ficar sob a lente deve sofrer um efeito lupa de zoom sutil para simular magnificação."*
