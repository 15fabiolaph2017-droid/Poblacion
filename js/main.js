document.addEventListener('DOMContentLoaded', () => {
    // --- Constantes del Modelo ---
    const P0 = 598000; // Población inicial aprox en 2024
    const k = 0.011;   // Tasa de crecimiento (1.1%)
    const baseYear = 2024;
    
    // --- Elementos del DOM ---
    const slider = document.getElementById('year-slider');
    const yearDisplay = document.getElementById('year-display');
    const currentYearLabel = document.getElementById('current-year-label');
    const populationDisplay = document.getElementById('population-display');
    const body = document.getElementById('app-body');
    
    const targetPopInput = document.getElementById('target-pop');
    const calcTimeBtn = document.getElementById('calc-time-btn');
    const targetTimeResult = document.getElementById('target-time-result');
    
    const customYearInput = document.getElementById('custom-year');
    const calcPopBtn = document.getElementById('calc-pop-btn');
    const customPopResult = document.getElementById('custom-pop-result');

    // -- Playback Variables --
    let isPlaying = false;
    let playInterval;
    const playBtn = document.getElementById('play-btn');
    const resetBtn = document.getElementById('reset-btn');

    // --- Formateador de números ---
    const formatNumber = (num) => {
        return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    // --- Función Ecuación Principal: P(t) = P0 * e^(kt) ---
    const calculatePopulation = (t) => {
        return P0 * Math.exp(k * t);
    };

    // --- Configuración Inicial de Chart.js ---
    const ctx = document.getElementById('growthChart').getContext('2d');
    
    // Generar datos base para el gráfico
    const labels = [];
    const dataPoints = [];
    for (let i = 0; i <= 50; i += 5) {
        labels.push(baseYear + i);
        dataPoints.push(calculatePopulation(i));
    }

    const growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Crecimiento Poblacional',
                data: dataPoints,
                borderColor: '#10b981', // Verde claro
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointRadius: 4,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#0f172a', font: { family: 'Inter', weight: 'bold' } }
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    ticks: { color: '#475569' }
                },
                x: {
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    ticks: { color: '#475569' }
                }
            }
        }
    });

    // --- Configuración de Leaflet Map ---
    // Coordenadas centrales de Cabo Verde
    const map = L.map('map', {
        center: [16.002, -24.013],
        zoom: 7,
        zoomControl: false // Posicionaremos después si es necesario
    });
    
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Usar un tile layer claro
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Coordenadas aproximadas de las islas principales de Cabo Verde
    const islands = [
        { name: "Santiago", lat: 15.08, lng: -23.62, weight: 0.55 }, // Isla más poblada
        { name: "São Vicente", lat: 16.85, lng: -24.98, weight: 0.15 },
        { name: "Santo Antão", lat: 17.06, lng: -25.06, weight: 0.08 },
        { name: "Fogo", lat: 14.93, lng: -24.39, weight: 0.07 },
        { name: "Sal", lat: 16.73, lng: -22.93, weight: 0.07 },
        { name: "Boa Vista", lat: 16.10, lng: -22.82, weight: 0.03 },
        { name: "Maio", lat: 15.22, lng: -23.16, weight: 0.02 },
        { name: "São Nicolau", lat: 16.61, lng: -24.27, weight: 0.02 },
        { name: "Brava", lat: 14.86, lng: -24.71, weight: 0.01 }
    ];

    const circleMarkers = [];

    // Dibujar círculos iniciales
    islands.forEach(island => {
        const circle = L.circle([island.lat, island.lng], {
            color: '#10b981', // Verde claro
            fillColor: '#10b981',
            fillOpacity: 0.5,
            radius: 10000 // Radio inicial
        }).addTo(map);
        circle.bindPopup(`<b>${island.name}</b>`);
        circleMarkers.push({ marker: circle, data: island });
    });

    // --- Actualización de la Interfaz según el tiempo (t) ---
    const updateUI = (t) => {
        const year = baseYear + t;
        const currentPop = calculatePopulation(t);
        
        // Actualizar textos
        yearDisplay.textContent = t;
        currentYearLabel.textContent = year;
        populationDisplay.textContent = formatNumber(currentPop);
        
        // Calcular intensidad (0 a 1) basada en el tiempo máx (50 años)
        const intensity = t / 50;
        
        // Actualizar clase del body para cambiar colores de la UI
        if (intensity < 0.33) {
            body.className = 'density-low';
        } else if (intensity < 0.66) {
            body.className = 'density-medium';
        } else {
            body.className = 'density-high';
        }
        
        // Interpolar color para mapa y gráfico: De Verde (#10b981) a Rojo intenso (#dc2626)
        // RGB aproximados para la interpolación:
        // Frío (Verde): 16, 185, 129
        // Cálido (Rojo): 220, 38, 38
        const r = Math.round(16 + (220 - 16) * intensity);
        const g = Math.round(185 + (38 - 185) * intensity);
        const b = Math.round(129 + (38 - 129) * intensity);
        const dynamicColor = `rgb(${r}, ${g}, ${b})`;
        const dynamicBgColor = `rgba(${r}, ${g}, ${b}, 0.2)`;

        // Actualizar Mapa
        circleMarkers.forEach(item => {
            // El radio base aumenta, y las islas con más peso crecen más rápido
            const newRadius = 10000 + (item.data.weight * intensity * 150000);
            item.marker.setRadius(newRadius);
            item.marker.setStyle({
                color: dynamicColor,
                fillColor: dynamicColor
            });
        });

        // Actualizar Gráfico (marcar el punto actual con un color diferente)
        growthChart.data.datasets[0].borderColor = dynamicColor;
        growthChart.data.datasets[0].backgroundColor = dynamicBgColor;
        growthChart.update();
    };

    // Evento del Slider
    slider.addEventListener('input', (e) => {
        const t = parseInt(e.target.value);
        updateUI(t);
        
        // Si el usuario mueve el slider, pausamos la simulación
        if (isPlaying) {
            togglePlay();
        }
    });

    // --- Lógica de Reproducción (Play/Pause/Reset) ---
    const togglePlay = () => {
        isPlaying = !isPlaying;
        if (isPlaying) {
            playBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pausar';
            // Intervalo más lento: 600ms
            playInterval = setInterval(() => {
                let currentVal = parseInt(slider.value);
                if (currentVal >= 50) {
                    clearInterval(playInterval);
                    isPlaying = false;
                    playBtn.innerHTML = '<i class="fa-solid fa-play"></i> Reanudar';
                } else {
                    slider.value = currentVal + 1;
                    updateUI(currentVal + 1);
                }
            }, 600);
        } else {
            clearInterval(playInterval);
            playBtn.innerHTML = '<i class="fa-solid fa-play"></i> Reanudar';
        }
    };

    playBtn.addEventListener('click', togglePlay);

    resetBtn.addEventListener('click', () => {
        if (isPlaying) {
            clearInterval(playInterval);
            isPlaying = false;
        }
        slider.value = 0;
        updateUI(0);
        playBtn.innerHTML = '<i class="fa-solid fa-play"></i> Reproducir';
    });

    // --- Eventos para Ecuaciones ---
    
    // b) Tiempo para alcanzar población objetivo
    // t = ln(P1/P0) / k
    calcTimeBtn.addEventListener('click', () => {
        const P1 = parseFloat(targetPopInput.value);
        if (isNaN(P1) || P1 <= 0) {
            targetTimeResult.textContent = "Ingrese una población válida.";
            return;
        }
        if (P1 < P0) {
            targetTimeResult.textContent = "La población debe ser mayor a la inicial (598k).";
            return;
        }
        
        const timeNeeded = Math.log(P1 / P0) / k;
        const targetYear = baseYear + timeNeeded;
        
        targetTimeResult.innerHTML = `Tomará <b>${timeNeeded.toFixed(2)} años</b>.<br>Se alcanzará en el año <b>${Math.floor(targetYear)}</b>.`;
    });

    // d) Analizar población en año específico
    calcPopBtn.addEventListener('click', () => {
        const year = parseFloat(customYearInput.value);
        if (isNaN(year)) {
            customPopResult.textContent = "Ingrese un año válido.";
            return;
        }
        
        const t = year - baseYear;
        const estimatedPop = calculatePopulation(t);
        
        customPopResult.innerHTML = `Población estimada en ${year}: <b>${formatNumber(estimatedPop)} habitantes</b>.`;
    });

    // Inicializar UI
    updateUI(0);
});
