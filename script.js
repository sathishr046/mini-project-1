// Constants
const API_KEY = '0f09309df2ee8f8a6d0628df5dcf104e'; // Replace with your OpenWeatherMap API key
const WEATHER_API_BASE_URL = 'https://api.openweathermap.org/data/2.5';
const WEATHER_BACKGROUNDS = {
    thunderstorm: 'thunderstorm.jpg',
    rain: 'rain.jpg',
    snow: 'snow.jpg',
    mist: 'mist.jpg',
    clear: 'clear.jpg',
    cloudy: 'cloudy.jpg',
    default: 'default.jpg'
};

// Global variables
let currentCity = '';
let map = null;
let weatherLayer = null;
let chart = null;
let isMetric = true;

// Initialize the application
function init() {
    preloadImages();
    initMap();
    loadLastCity();
    setupEventListeners();
    document.body.style.backgroundImage = `url('images/${WEATHER_BACKGROUNDS.default}')`;
}

// Preload background images
function preloadImages() {
    Object.values(WEATHER_BACKGROUNDS).forEach(imageName => {
        const img = new Image();
        img.src = `images/${imageName}`;
    });
}

// Initialize the map
function initMap() {
    map = L.map('weather-map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

// Load the last searched city
function loadLastCity() {
    const lastCity = localStorage.getItem('lastCity');
    if (lastCity) {
        document.getElementById('city-input').value = lastCity;
        getWeather();
    }
}

// Set up event listeners
function setupEventListeners() {
    document.getElementById('city-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            getWeather();
        }
    });
}

// Update background image based on weather condition
function updateBackgroundImage(weatherCode) {
    const body = document.body;
    let backgroundImage = WEATHER_BACKGROUNDS.default;
    
    if (weatherCode >= 200 && weatherCode < 300) {
        backgroundImage = WEATHER_BACKGROUNDS.thunderstorm;
    } else if (weatherCode >= 300 && weatherCode < 600) {
        backgroundImage = WEATHER_BACKGROUNDS.rain;
    } else if (weatherCode >= 600 && weatherCode < 700) {
        backgroundImage = WEATHER_BACKGROUNDS.snow;
    } else if (weatherCode >= 700 && weatherCode < 800) {
        backgroundImage = WEATHER_BACKGROUNDS.mist;
    } else if (weatherCode === 800) {
        backgroundImage = WEATHER_BACKGROUNDS.clear;
    } else if (weatherCode > 800) {
        backgroundImage = WEATHER_BACKGROUNDS.cloudy;
    }

    const img = new Image();
    img.onload = function() {
        body.style.backgroundImage = `url('images/${backgroundImage}')`;
    };
    img.onerror = function() {
        console.warn(`Background image ${backgroundImage} not found, using default`);
        body.style.backgroundImage = `url('images/${WEATHER_BACKGROUNDS.default}')`;
    };
    img.src = `images/${backgroundImage}`;
}

// Get weather data
async function getWeather() {
    const city = document.getElementById('city-input').value;
    if (!city) return;

    showLoading(true);
    try {
        const response = await fetch(
            `${WEATHER_API_BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=${isMetric ? 'metric' : 'imperial'}`
        );
        const data = await response.json();

        if (response.ok) {
            currentCity = city;
            localStorage.setItem('lastCity', city);
            displayWeather(data);
            updateMap(data.coord.lat, data.coord.lon);
            getForecast(city);
            hideError();
        } else {
            showError(data.message);
        }
    } catch (error) {
        showError('Failed to fetch weather data');
    } finally {
        showLoading(false);
    }
}

// Display weather data
function displayWeather(data) {
    const unit = isMetric ? '°C' : '°F';
    const speedUnit = isMetric ? 'km/h' : 'mph';
    const windSpeed = isMetric ? data.wind.speed * 3.6 : data.wind.speed;

    document.getElementById('city').textContent = data.name;
    document.getElementById('date').textContent = new Date().toLocaleDateString();
    document.getElementById('temperature').textContent = `${Math.round(data.main.temp)}${unit}`;
    document.getElementById('description').textContent = data.weather[0].description;
    document.getElementById('feels-like').textContent = `${Math.round(data.main.feels_like)}${unit}`;
    document.getElementById('wind-speed').textContent = `${Math.round(windSpeed)} ${speedUnit}`;
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;
    
    const weatherIcon = document.getElementById('weather-icon');
    const iconCode = data.weather[0].icon;
    weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
    weatherIcon.alt = data.weather[0].description;
    
    updateBackgroundImage(data.weather[0].id);
}

// Get forecast data
async function getForecast(city) {
    try {
        const response = await fetch(
            `${WEATHER_API_BASE_URL}/forecast?q=${city}&appid=${API_KEY}&units=${isMetric ? 'metric' : 'imperial'}`
        );
        const data = await response.json();

        if (response.ok) {
            displayForecast(data);
            updateChart(data);
        }
    } catch (error) {
        console.error('Failed to fetch forecast data:', error);
    }
}

// Display forecast data
function displayForecast(data) {
    const forecastContainer = document.getElementById('forecast');
    forecastContainer.innerHTML = '';

    const dailyData = data.list.filter(item => item.dt_txt.includes('12:00:00'));
    
    dailyData.forEach(day => {
        const date = new Date(day.dt * 1000);
        const temp = Math.round(day.main.temp);
        const icon = day.weather[0].icon;
        
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        forecastItem.innerHTML = `
            <div>${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
            <img 
                src="https://openweathermap.org/img/wn/${icon}@2x.png" 
                alt="Weather icon"
                onerror="this.src='https://openweathermap.org/img/wn/10d@2x.png'"
            >
            <div>${temp}${isMetric ? '°C' : '°F'}</div>
        `;
        
        forecastContainer.appendChild(forecastItem);
    });
}

// Update the map
function updateMap(lat, lon) {
    if (map) {
        map.setView([lat, lon], 10);
        if (weatherLayer) {
            map.removeLayer(weatherLayer);
        }
        weatherLayer = L.tileLayer(
            `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${API_KEY}`,
            {
                maxZoom: 18,
                opacity: 0.5
            }
        ).addTo(map);
    }
}

// Update the temperature chart
function updateChart(data) {
    const ctx = document.getElementById('temp-chart').getContext('2d');
    
    if (chart) {
        chart.destroy();
    }
    
    const temperatures = data.list.map(item => item.main.temp);
    const labels = data.list.map(item => 
        new Date(item.dt * 1000).toLocaleDateString('en-US', {
            weekday: 'short',
            hour: 'numeric'
        })
    );

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Temperature (${isMetric ? '°C' : '°F'})`,
                data: temperatures,
                borderColor: '#2196f3',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Toggle temperature unit
function toggleUnit() {
    isMetric = !isMetric;
    if (currentCity) {
        getWeather();
    }
}

// Toggle theme
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
}

// Get current location
function getCurrentLocation() {
    if (navigator.geolocation) {
        showLoading(true);
        navigator.geolocation.getCurrentPosition(
            position => {
                getWeatherByCoords(position.coords.latitude, position.coords.longitude);
            },
            error => {
                showError('Unable to get location');
                showLoading(false);
            }
        );
    } else {
        showError('Geolocation is not supported by this browser');
    }
}

// Get weather by coordinates
async function getWeatherByCoords(lat, lon) {
    try {
        const response = await fetch(
            `${WEATHER_API_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${isMetric ? 'metric' : 'imperial'}`
        );
        const data = await response.json();

        if (response.ok) {
            document.getElementById('city-input').value = data.name;
            currentCity = data.name;
            displayWeather(data);
            updateMap(lat, lon);
            getForecast(data.name);
            hideError();
        } else {
            showError(data.message);
        }
    } catch (error) {
        showError('Failed to fetch weather data');
    } finally {
        showLoading(false);
    }
}

// Show loading overlay
function showLoading(show) {
    document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
}

// Show error message
function showError(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// Hide error message
function hideError() {
    document.getElementById('error-message').style.display = 'none';
}

// Initialize the app when the page loads
window.onload = init;