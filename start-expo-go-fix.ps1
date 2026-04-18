# Script para iniciar Expo Go com rede corrigida
# Desativa interfaces virtuais/VPN que bloqueiam conexão Android

Write-Host "🔧 Configurando rede para Expo Go..." -ForegroundColor Cyan

# Força IP da rede Wi-Fi real
$wifiIP = "192.168.1.54"

Write-Host "📡 Usando IP LAN: $wifiIP" -ForegroundColor Green
Write-Host "⚠️  Certifique-se de que:" -ForegroundColor Yellow
Write-Host "   1. Sua VPN (NordLynx) está desativada" -ForegroundColor Yellow
Write-Host "   2. PC e Android estão na mesma rede Wi-Fi" -ForegroundColor Yellow
Write-Host "   3. Firewall Windows permite porta 8081-8090" -ForegroundColor Yellow

Write-Host "`n✅ Iniciando Expo Go com rede LAN corrigida..." -ForegroundColor Cyan

# Limpa cache e força rede
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $wifiIP
$env:RCT_METRO_PORT = "8081"

# Inicia Expo Go sem Dev Client
npx expo start --go --lan --clear
