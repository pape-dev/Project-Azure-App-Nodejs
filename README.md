# 📄 Projet Azure Cloud Computing (Examen E4 CCSN) 

![Azure](https://img.shields.io/badge/Cloud-Microsoft%20Azure-0089D6?style=flat&logo=microsoftazure)
![PowerShell](https://img.shields.io/badge/Automation-PowerShell-5391FE?style=flat&logo=powershell)
![MySQL](https://img.shields.io/badge/Database-MySQL%20Flexible%20Server-4479A1?style=flat&logo=mysql)
![Ubuntu](https://img.shields.io/badge/OS-Ubuntu_22.04_LTS-E95420?style=flat&logo=ubuntu)
![Node.js](https://img.shields.io/badge/Runtime-Node.js_20_LTS-339933?style=flat&logo=nodedotjs)
![Security](https://img.shields.io/badge/Security-Firewall_Active-success?style=flat)


---

# Partie 1 : Déploiement des ressources :

## Description

Ce script PowerShell automatise le déploiement d'une architecture d'infrastructure sur Microsoft Azure, en créant un environnement réseau sécurisé, un load balancer, des machines virtuelles, une base de données MySQL flexible, ainsi qu'un service web pour héberger une application Node.js. Le déploiement est conçu pour une entreprise utilisant une architecture IaaS (Infrastructure as a Service) et PaaS (Platform as a Service).

### Composants déployés :
- **Réseau virtuel (VNet)**
- **Load Balancer (Standard SKU)**
- **Machines virtuelles (VMs)**
- **Base de données MySQL flexible**
- **Application Web Node.js (PaaS)**
- **Stockage Azure (Blob Storage)**

## Prérequis

- Azure CLI installé et configuré sur votre machine
- Compte Azure avec les permissions suffisantes pour créer des ressources
- PowerShell 7+ pour exécuter le script
- Connexion à Internet pour accéder à Azure et aux ressources externes

## Variables Globales

Les paramètres de configuration principaux sont définis dans la section **Variables Globales** du script. Voici un aperçu de ceux-ci :

- **ResourceGroup** : Le groupe de ressources où toutes les ressources seront créées.
- **Location** : La région Azure où les ressources seront déployées.
- **VNetName** : Le nom du réseau virtuel (VNet).
- **AppSubnet** : Le nom du sous-réseau pour les applications.
- **LBName** : Le nom du Load Balancer (LB) public.
- **VMSize** : La taille des machines virtuelles (ex: `Standard_B1s`).
- **AdminUser** : L'utilisateur administrateur pour les VMs.
- **DBName** : Nom généré dynamiquement pour la base de données MySQL.
- **WebAppName** : Nom généré dynamiquement pour l'application web.
- **StorageName** : Nom généré dynamiquement pour le stockage Azure.

## Déploiement

Le script est divisé en plusieurs étapes pour déployer les différentes ressources Azure. Voici un résumé des étapes de déploiement.

### 1. **Configuration du Réseau et de la Sécurité (NSG)**

- Création d'un groupe de ressources.
- Déploiement d'un réseau virtuel (VNet) avec un sous-réseau dédié aux applications.
- Configuration d'un groupe de sécurité réseau (NSG) avec des règles pour permettre l'accès SSH (port 22), HTTP (port 80), et un port spécifique pour Node.js (port 3000).

### 2. **Configuration du Load Balancer**

- Création d'un Load Balancer Standard avec une IP publique.
- Mise en place d'une sonde de santé pour vérifier l'état des instances en arrière-plan.
- Création d'une règle de Load Balancer pour diriger le trafic HTTP vers les VMs.

### 3. **Déploiement des Machines Virtuelles (VMs)**

- Déploiement de plusieurs machines virtuelles avec une interface réseau (NIC) dédiée et connectée au Load Balancer.
- Configuration des VMs avec Ubuntu 22.04, taille de machine `Standard_B1s`, et un mot de passe administrateur.

### 4. **Déploiement de la Base de Données MySQL Flexible**

- Création d'un serveur MySQL flexible avec le niveau "Burstable".
- Autorisation de l'accès depuis l'IP locale et les IP des VMs créées.

### 5. **Déploiement de l'Application Web et du Stockage**

- Vérification de l'existence d'un compte de stockage et création si nécessaire.
- Déploiement d'une application Node.js sur Azure App Service (PaaS).
- Déploiement d'un plan App Service et configuration de l'application web pour utiliser la version LTS de Node.js.
  
### 6. **Finalisation et Rapport**

À la fin du déploiement, un rapport détaillé est affiché avec les informations suivantes :
- L'IP publique du Load Balancer.
- Le nom d'hôte de la base de données MySQL.
- Le nombre de VMs déployées.
- L'URL de l'application web déployée.

## **Exécution du Script** 
```

# =============================================================================
# 1. VARIABLES GLOBALES
# =============================================================================
$globalConfig = @{
    ResourceGroup = "RG-PRO-ENTERPRISE-PROJECT"
    Location      = "norwayeast"
    VNetName      = "VNET-Core-Net"
    AppSubnet     = "Subnet-Apps"
    LBName        = "LB-Public-Service"
    LBIPName      = "IP-LB-Frontend"
    VMSize        = "Standard_B1s" # Optimisé pour quota 4 vCPUs
    AdminUser     = "dspi_admin"
    AdminPass     = "Azure@2025Ready!" 
    DBName        = "db-mysql-flexible-$(Get-Random -Min 1000 -Max 9999)"
    DBAdmin       = "mysqladmin"
    DBPass        = "Enterprise@Secure2025#"
    WebAppName    = "app-node-enterprise-$(Get-Random -Min 1000 -Max 9999)"
    StorageName   = "stproenterprise$(Get-Random -Min 10000 -Max 99999)"
}

# Détection automatique de votre IP publique
Write-Host "`n🔍 Détection de votre IP publique locale..." -ForegroundColor Cyan
try {
    $myLocalIP = (Invoke-RestMethod -Uri "https://ifconfig.me/ip" -ErrorAction Stop).Trim()
    Write-Host "✅ Votre IP détectée : $myLocalIP" -ForegroundColor Yellow
} catch {
    $myLocalIP = $null
    Write-Host "⚠️ Détection IP échouée. Accès manuel requis pour la DB." -ForegroundColor Red
}

Write-Host "`n[INIT] Démarrage du déploiement Enterprise Stack v7.0..." -ForegroundColor Cyan
Write-Host "---------------------------------------------------------------------"

# =============================================================================
# 2. RÉSEAU ET NSG
# =============================================================================
Write-Host "[1/8] Configuration Réseau et Sécurité (NSG)..." -ForegroundColor Magenta
az group create --name $globalConfig.ResourceGroup --location $globalConfig.Location --output none

az network vnet create -g $globalConfig.ResourceGroup -n $globalConfig.VNetName --address-prefix "10.0.0.0/16" `
    --subnet-name $globalConfig.AppSubnet --subnet-prefix "10.0.1.0/24" --output none

az network nsg create -g $globalConfig.ResourceGroup -n "NSG-Core" --output none

# Règles NSG (22, 80, 3000)
az network nsg rule create -g $globalConfig.ResourceGroup --nsg-name "NSG-Core" --name "Allow-SSH" --priority 100 --protocol Tcp --destination-port-ranges 22 --access Allow --direction Inbound --output none
az network nsg rule create -g $globalConfig.ResourceGroup --nsg-name "NSG-Core" --name "Allow-HTTP" --priority 110 --protocol Tcp --destination-port-ranges 80 --access Allow --direction Inbound --output none
az network nsg rule create -g $globalConfig.ResourceGroup --nsg-name "NSG-Core" --name "Allow-Node-3000" --priority 120 --protocol Tcp --destination-port-ranges 3000 --access Allow --direction Inbound --output none

# =============================================================================
# 3. LOAD BALANCER
# =============================================================================
Write-Host "[2/8] Configuration Load Balancer (Standard SKU)..." -ForegroundColor Magenta
az network public-ip create -g $globalConfig.ResourceGroup -n $globalConfig.LBIPName --sku Standard --output none

az network lb create -g $globalConfig.ResourceGroup -n $globalConfig.LBName --sku Standard `
    --public-ip-address $globalConfig.LBIPName --frontend-ip-name "FrontEnd" --backend-pool-name "BackEndPool" --output none

az network lb probe create -g $globalConfig.ResourceGroup --lb-name $globalConfig.LBName --name "Probe-HTTP" --protocol tcp --port 80 --output none

az network lb rule create -g $globalConfig.ResourceGroup --lb-name $globalConfig.LBName --name "Rule-HTTP" `
    --protocol tcp --frontend-port 80 --backend-port 80 --frontend-ip-name "FrontEnd" `
    --backend-pool-name "BackEndPool" --probe-name "Probe-HTTP" --output none

# =============================================================================
# 4. DÉPLOIEMENT DES VMs (MÉTHODE NIC DÉCOUPLÉE)
# =============================================================================
Write-Host "[3/8] Déploiement des VMs (IaaS) avec intégration LB..." -ForegroundColor Magenta
$vmList = @("VM-PROD-01", "VM-PROD-02")
$vmInfos = @()

# Récupération de l'ID du Backend Pool pour l'association des NICs
$lbPoolId = az network lb address-pool show -g $globalConfig.ResourceGroup --lb-name $globalConfig.LBName --name "BackEndPool" --query "id" -o tsv

foreach ($vm in $vmList) {
    Write-Host "     -> Étape 1 : Création Interface Réseau (NIC) pour $vm..." -ForegroundColor Gray
    $nicName = "$vm-NIC"
    az network nic create -g $globalConfig.ResourceGroup -n $nicName `
        --vnet-name $globalConfig.VNetName --subnet $globalConfig.AppSubnet `
        --network-security-group "NSG-Core" `
        --lb-address-pools $lbPoolId --output none

    Write-Host "     -> Étape 2 : Provisionnement de la VM $vm..." -ForegroundColor Cyan
    $vmJson = az vm create `
      --resource-group $globalConfig.ResourceGroup `
      --name $vm `
      --location $globalConfig.Location `
      --image "Ubuntu2204" `
      --size $globalConfig.VMSize `
      --nics $nicName `
      --admin-username $globalConfig.AdminUser `
      --admin-password $globalConfig.AdminPass `
      --public-ip-sku Standard `
      --output json 

    if ($null -ne $vmJson) {
        $vmObj = $vmJson | ConvertFrom-Json
        $ip = $vmObj.publicIpAddress
        Write-Host "     ✅ $vm créé avec succès ! IP: $ip" -ForegroundColor Green
        $vmInfos += New-Object PSObject -Property @{ Name = $vm; IP = $ip }
    } else {
        Write-Host "     ❌ ÉCHEC critique sur $vm." -ForegroundColor Red
    }
}

# =============================================================================
# 5. MYSQL FLEXIBLE SERVER & FIREWALL
# =============================================================================
Write-Host "[4/8] Configuration MySQL Flexible (Tier Burstable)..." -ForegroundColor Magenta
az mysql flexible-server create -g $globalConfig.ResourceGroup -n $globalConfig.DBName `
    --location $globalConfig.Location --admin-user $globalConfig.DBAdmin `
    --admin-password $globalConfig.DBPass --sku-name Standard_B1ms `
    --tier Burstable --version 8.0.21 --public-access Enabled --output none

# Autorisation IP Locale
if ($null -ne $myLocalIP) {
    az mysql flexible-server firewall-rule create -g $globalConfig.ResourceGroup -n $globalConfig.DBName `
        --rule-name "Allow-My-IP" --start-ip-address $myLocalIP --end-ip-address $myLocalIP --output none
}

# Autorisation IPs des VMs
foreach ($vm in $vmInfos) {
    Write-Host "     -> Firewall : Autorisation VM $($vm.Name)..." -ForegroundColor Yellow
    az mysql flexible-server firewall-rule create -g $globalConfig.ResourceGroup -n $globalConfig.DBName `
        --rule-name "Allow-$($vm.Name)" --start-ip-address $($vm.IP) --end-ip-address $($vm.IP) --output none
}

# =============================================================================
# 6. PAAS (WEB APP & STORAGE)
# =============================================================================
Write-Host "[5/8] Finalisation App Service & Storage..." -ForegroundColor Magenta

if (!(Get-AzStorageAccount -ResourceGroupName $globalConfig.ResourceGroup -Name $globalConfig.StorageName -ErrorAction SilentlyContinue)) {
    New-AzStorageAccount -ResourceGroupName $globalConfig.ResourceGroup -Name $globalConfig.StorageName `
        -Location $globalConfig.Location -SkuName "Standard_LRS" -Kind "StorageV2" -AllowBlobPublicAccess $false | Out-Null
}

$plan = New-AzAppServicePlan -Name "ASP-PRO-ENT" -ResourceGroupName $globalConfig.ResourceGroup -Location $globalConfig.Location -Tier "Basic" -Linux
$webapp = New-AzWebApp -Name $globalConfig.WebAppName -ResourceGroupName $globalConfig.ResourceGroup -Location $globalConfig.Location -AppServicePlan "ASP-PRO-ENT"
Set-AzWebApp -ResourceGroupName $globalConfig.ResourceGroup -Name $globalConfig.WebAppName -LinuxFxVersion "NODE|20-lts" -HttpsOnly $true | Out-Null

# =============================================================================
# 7. RAPPORT FINAL
# =============================================================================
Write-Host "`n=====================================================================" -ForegroundColor Green
Write-Host " 🏅 ARCHITECTURE ENTREPRISE DÉPLOYÉE AVEC SUCCÈS" -ForegroundColor Green
Write-Host "====================================================================="
Write-Host " 🌐 LOAD BALANCER IP : http://$(az network public-ip show -g $globalConfig.ResourceGroup -n $globalConfig.LBIPName --query "ipAddress" -o tsv)"
Write-Host " 🏦 MYSQL HOSTNAME   : $($globalConfig.DBName).mysql.database.azure.com"
Write-Host " 🖥️ VMs DÉPLOYÉES    : $($vmInfos.Count) serveurs actifs."
Write-Host " 🌍 WEB APP URL      : https://$($globalConfig.WebAppName).azurewebsites.net"
Write-Host "====================================================================="

```

# Partie 2 : Connexion au server pour la création de la base de données

#### 1. Connexion au Serveur MySQL via MySQL Workbench
1. **Télécharger et installer MySQL Workbench** : Vous pouvez obtenir MySQL Workbench [ici](https://dev.mysql.com/downloads/workbench/).
2. **Lancer MySQL Workbench** et se connecter à votre serveur MySQL :
   - **Hôte** : Utilisez l'hostname de votre serveur MySQL, par exemple : `votre-nom-de-serveur.mysql.database.azure.com`
   - **Nom d'utilisateur** : Utilisez le nom d'utilisateur admin que vous avez défini, par exemple : `mysqladmin`
   - **Mot de passe** : Utilisez le mot de passe défini pour l'utilisateur admin.
   
   Vous devez également vous assurer que votre adresse IP locale est autorisée à se connecter au serveur, sinon vous recevrez une erreur de connexion.

#### 2. Création de la Base de Données et des Tables

Une fois connecté au serveur MySQL, exécutez les commandes suivantes dans MySQL Workbench ou dans un terminal MySQL.

##### 1. Création de la Base de Données

```
CREATE DATABASE IF NOT EXISTS appdb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

#####  2. Sélection de la Base de Données

```
USE appdb;

```

##### 3. Création de la Table employees

```
CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(50) NOT NULL,
  firstName VARCHAR(100) NOT NULL,
  lastName VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  department VARCHAR(100) NOT NULL,
  position VARCHAR(100) NOT NULL,
  status ENUM('active','inactive','remote') NOT NULL DEFAULT 'active',
  hireDate DATE NOT NULL,
  salary DECIMAL(10,2) NOT NULL,
  avatar VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_email (email)
);

```

##### 4. Création de la Table contact

```
CREATE TABLE IF NOT EXISTS contact (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


```

# Partie 3 :  🐳 Installation Docker (Script Bash)

## Étapes pour installer Docker en utilisant un script Bash

Suivez les étapes ci-dessous pour créer un script d'installation Docker et l'exécuter sur une machine Ubuntu.

### 1. Créez un fichier Bash pour l'installation de Docker

Créez un fichier Bash, par exemple `install_docker.sh`, dans lequel vous allez copier le code du script.

```
nano install_docker.sh
```

### 2. Copiez le code du script

Copiez le code du script d'installation Docker que vous avez reçu dans le fichier install_docker.sh. voici le cde : 

```
#!/bin/bash

# =============================================================================
# SCRIPT D'INSTALLATION ET DE MISE À JOUR DE DOCKER ENGINE SUR UBUNTU
#
# Ce script exécute les étapes officielles pour désinstaller les anciennes versions,
# configurer le dépôt Docker et installer les dernières versions des paquets.
#
# =============================================================================

# --- 1. CONFIGURATION ET FONCTIONS ---
SCRIPT_NAME=$(basename "$0")
LOG_FILE="/var/log/docker_install_official_$(date +%Y%m%d_%H%M%S).log"
DOCKER_USER=$(whoami)

# Fonction pour afficher des messages d'erreur et quitter
function die {
    echo -e "\n🚨 ERREUR: $1" | tee -a "$LOG_FILE" >&2
    echo "Consultez le fichier de log pour plus de détails: $LOG_FILE"
    exit 1
}

# Fonction pour journaliser les actions
function log_action {
    echo "--- $(date +%Y-%m-%d\ %H:%M:%S) --- $1" | tee -a "$LOG_FILE"
    echo "➡️ $1"
}

# Vérification des privilèges (script doit être exécuté en tant que root)
if [ "$EUID" -ne 0 ]; then
    die "Ce script doit être exécuté avec des privilèges root (sudo)."
fi

log_action "Démarrage du processus d'installation/mise à jour de Docker..."

# --- 2. DÉSINSTALLATION DES VERSIONS INCOMPATIBLES/OBSOLÈTES ---
log_action "Désinstallation des paquets Docker/Conteneur non officiels ou anciens..."

# Commande optimisée pour la désinstallation des paquets existants
dpkg --get-selections | grep -E 'docker.io|docker-compose|docker-compose-v2|docker-doc|podman-docker|containerd|runc' | awk '{print $1}' | xargs -r apt remove -y >> "$LOG_FILE" 2>&1

# Optionnel : suppression des fichiers de configuration résiduels
# apt purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >> "$LOG_FILE" 2>&1

log_action "Désinstallation terminée."

# --- 3. PRÉPARATION ET CONFIGURATION DU DÉPÔT DOCKER ---
log_action "Installation des dépendances nécessaires pour gérer les dépôts (ca-certificates, curl)..."
apt update >> "$LOG_FILE" 2>&1 || die "Échec de la mise à jour des index APT."
apt install -y ca-certificates curl >> "$LOG_FILE" 2>&1 || die "Échec de l'installation des prérequis."

log_action "Téléchargement de la clé GPG officielle de Docker..."
install -m 0755 -d /etc/apt/keyrings >> "$LOG_FILE" 2>&1
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc >> "$LOG_FILE" 2>&1 || die "Échec du téléchargement de la clé GPG Docker."
chmod a+r /etc/apt/keyrings/docker.asc

log_action "Ajout du dépôt Docker Stable aux sources APT..."
# Utilisation de 'tee' pour écrire dans le fichier avec les privilèges sudo
tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF

log_action "Le dépôt Docker a été ajouté avec succès."

# --- 4. INSTALLATION DE DOCKER ENGINE ---
log_action "Mise à jour des index APT après ajout du dépôt Docker..."
apt update >> "$LOG_FILE" 2>&1 || die "Échec de la mise à jour des index après ajout du dépôt Docker."

log_action "Installation des paquets Docker (docker-ce, cli, buildx, compose)..."
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >> "$LOG_FILE" 2>&1 || die "Échec de l'installation des paquets Docker."

log_action "Docker Engine et ses outils ont été installés avec succès."

# --- 5. GESTION DU SERVICE ET VÉRIFICATION ---
log_action "Vérification et démarrage du service Docker..."
systemctl start docker >> "$LOG_FILE" 2>&1
systemctl enable docker >> "$LOG_FILE" 2>&1

if systemctl is-active --quiet docker; then
    log_action "✅ Docker Engine est installé et le service est ACTIF."
else
    die "Le service Docker n'a pas pu démarrer. Vérifiez les dépendances."
fi

log_action "Affichage du statut de Docker..."
systemctl status docker | head -n 3 | tee -a "$LOG_FILE"

# --- 6. CONFIGURATION POST-INSTALLATION (Docker sans sudo) ---
log_action "Ajout de l'utilisateur '$DOCKER_USER' au groupe 'docker'..."
usermod -aG docker "$DOCKER_USER" >> "$LOG_FILE" 2>&1

log_action "Test de la commande Docker (hello-world)..."
docker run hello-world >> "$LOG_FILE" 2>&1 || log_action "ATTENTION: Le test 'hello-world' a échoué. L'utilisateur doit se déconnecter et se reconnecter pour prendre en compte le groupe Docker."

# --- 7. FINALISATION ---
echo ""
echo "=================================================================="
echo "🎉 INSTALLATION DE DOCKER TERMINÉE AVEC SUCCÈS"
echo "=================================================================="
echo "Version de Docker : $(docker --version)"
echo "Utilisateur '$DOCKER_USER' ajouté au groupe 'docker'."
echo ""
echo "ACTION REQUISE : Pour utiliser Docker sans 'sudo', vous devez :"
echo "   1. VOUS DÉCONNECTER (logout)."
echo "   2. VOUS RECONNECTER à votre session."
echo ""
echo "Fichier de journalisation : $LOG_FILE"
echo "Vous pouvez consulter le fichier de log pour tout problème survenu pendant l'installation."

exit 0

```

### 3. Donnez les autorisations d'exécution au script

```
sudo chmod +x install_docker.sh
```

### 4. Exécutez le script avec les privilèges root

```
sudo ./install_docker.sh
```

# Partie 4 : 📦 Dépendances applicatives dans chaque VM
```
sudo apt update && sudo apt upgrade -y
# Installation de Node.js (via NodeSource pour avoir une version récente)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git
# Installation globale de PM2
sudo npm install -g pm2
```

## Cloner L'application 

### 🔐 Accès GitHub via SSH

Au niveau de chaque VM : 

- 1️⃣ Générer une clé SSH

```
ssh-keygen -t ed25519 -C "pape-dev"

```

- 3️⃣ Copier la clé publique

```
cat ~/.ssh/id_ed25519.pub

```

- 4️⃣ Ajouter la clé sur GitHub : GitHub → Settings → SSH and GPG keys → New SSH key - Colle la clé → Save

- 5️⃣ Cloner le repo en SSH

```
git clone [url]
cd + 📂 

```
### Lancement avec PM2

```
cd ~/dspi-tech-employee-hub
pm2 start server/index.js --name "api-backend"
pm2 save 

```

## Installer les dépendances

```
npm install

```
## Build du projet

```
npm run build

```

## Configuration de Nginx (Reverse Proxy)

```
 nano /etc/nginx/sites-available/mon_app
 
```

code à mettre :

```
server {
    listen 80;
    server_name 4.235.106.204; # Votre IP Azure

    # Serveur de fichiers statiques (Frontend)
    location / {
        root /home/dspi/dspi-tech-employee-hub/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy vers le Backend (Express)
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

```
## Gestion des permissions

```
# Autoriser Nginx à accéder à votre dossier utilisateur
sudo chmod +x /home/dspi

# Donner les droits de lecture sur le projet
sudo chmod -R 755 /home/dspi/dspi-tech-employee-hub

```
## Activation

```
sudo ln -s /etc/nginx/sites-available/mon_app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

```

## Quelques commandes utiles

```
# Voir si le backend est "online"
pm2 status

# Redémarrer le backend
pm2 restart api-backend

# Voir les logs du backend (erreurs de code ou base de données)
pm2 logs api-backend

# Sauvegarder pour le redémarrage automatique de la VM
pm2 save

```

## Statut du pm2

- VM 1


- VM 2



## Se connecter à l'application

- VM 1  : IP Publique


- VM 2 : IP Publique


## Vérifier les insertions de la base de données


# Partie 5 : Configuration du load balancer

## Au niveau du code > VM 1 & VM 2 Mettre à jour la configuration du nginx

```
sudo nano /etc/nginx/sites-available/mon_app

```
Les IP "Server_Name" ont été remplacés par "_" : 

```
npm run build

sudo systemctl restart nginx

pm2 restart api-backend

```
## Se connecter avec l'IP du Load Balancer 

# Partie 6 : Déploiement de l'application dans AppService

---


## ✅ Conclusion
Ce projet valide les compétences suivantes :
- Provisionnement IaaS via scripts automatisés.
- Gestion de services PaaS (MySQL Managé).
- Conteneurisation et Reverse Proxy (Docker / Nginx).
- Haute Disponibilité (Standard Load Balancer).
- Déployer & héberger des applications 
- Sécurisation (Groupes de sécurité et SSH).



---

# Application Web : DSPI-TECH Employee Hub

Application web complète de gestion des employés et des contacts pour DSPI-TECH. Cette application permet de gérer les informations des collaborateurs, d'ajouter de nouveaux employés, de consulter les données et d'exporter les informations au format CSV.

## 📋 Table des matières

- [Description](#description)
- [Fonctionnalités](#fonctionnalités)
- [Technologies utilisées](#technologies-utilisées)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Structure du projet](#structure-du-projet)
- [API Endpoints](#api-endpoints)
- [Base de données](#base-de-données)
- [Utilisation](#utilisation)
- [Scripts disponibles](#scripts-disponibles)
- [Déploiement](#déploiement)
- [Contribution](#contribution)

## 🎯 Description

DSPI-TECH Employee Hub est une application full-stack moderne permettant de :
- Visualiser et gérer les informations des employés
- Ajouter de nouveaux collaborateurs
- Gérer les contacts via un formulaire
- Exporter les données en CSV
- Filtrer et trier les données des employés

## ✨ Fonctionnalités

### Page d'accueil (Index)
- Vue d'ensemble avec statistiques des employés
- Présentation des fonctionnalités principales
- Navigation vers les différentes sections

### Gestion des salariés (Salaries)
- Affichage de tous les employés dans un tableau interactif
- Recherche par nom, email ou poste
- Filtrage par département et statut
- Tri par nom, département, poste, date d'embauche ou salaire
- Statistiques en temps réel (Total, Actifs, Remote, Inactifs)
- Export CSV des employés filtrés

### Ajout d'employé (Nouveau)
- Formulaire complet pour ajouter un nouvel employé
- Validation des champs obligatoires
- Génération automatique d'ID unique
- Gestion des départements et postes prédéfinis

### Contact
- Formulaire de contact pour les visiteurs
- Enregistrement des messages en base de données
- Export CSV des contacts
- Informations de contact de l'entreprise

## 🛠 Technologies utilisées

### Frontend
- **React 18.3.1** - Bibliothèque UI
- **TypeScript 5.8.3** - Typage statique
- **Vite 7.3.0** - Build tool et dev server
- **React Router DOM 6.30.1** - Routage
- **Tailwind CSS 3.4.17** - Framework CSS
- **shadcn/ui** - Composants UI basés sur Radix UI
- **Lucide React** - Icônes
- **TanStack Query** - Gestion des données serveur
- **React Hook Form** - Gestion des formulaires
- **Zod** - Validation de schémas

### Backend
- **Node.js** - Runtime JavaScript
- **Express 4.22.1** - Framework web
- **MySQL2 3.16.0** - Driver MySQL
- **CORS 2.8.5** - Gestion CORS
- **dotenv 16.6.1** - Variables d'environnement

### Outils de développement
- **ESLint** - Linter
- **TypeScript ESLint** - Linter TypeScript
- **Concurrently** - Exécution parallèle de scripts

## 📦 Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- **Node.js** (version 18 ou supérieure) - [Télécharger Node.js](https://nodejs.org/)
- **npm** (inclus avec Node.js) ou **yarn**
- **MySQL** (version 8.0 ou supérieure) - [Télécharger MySQL](https://dev.mysql.com/downloads/mysql/)
- **Git** - [Télécharger Git](https://git-scm.com/)

## 🚀 Installation

### 1. Cloner le repository

```bash
git clone <URL_DU_REPOSITORY>
cd dspi-tech-employee-hub
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer la base de données

Créez une base de données MySQL et exécutez le script SQL :

```bash
mysql -u root -p < Docs_Config/bd.sql
```

Ou connectez-vous à MySQL et exécutez le contenu du fichier `Docs_Config/bd.sql`.

### 4. Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet :

```env
# Configuration de la base de données
DB_HOST="Server database for MySQL"
DB_PORT=3306
DB_NAME=appdb
DB_USER=votre_utilisateur
DB_PASSWORD=votre_mot_de_passe

# Configuration du serveur API
PORT=3000

# Configuration du frontend (optionnel)
VITE_API_URL=http://localhost:3000
```

### 5. Démarrer l'application

#### Option 1 : Démarrer frontend et backend ensemble
```bash
npm run dev:full
```

#### Option 2 : Démarrer séparément

Terminal 1 - Frontend :
```bash
npm run dev
```

Terminal 2 - Backend :
```bash
npm run server
```

L'application sera accessible sur :
- **Frontend** : http://localhost:8080
- **Backend API** : http://localhost:3000

## ⚙️ Configuration

### Variables d'environnement

#### Backend (`.env`)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DB_HOST` | Adresse du serveur MySQL | `localhost` |
| `DB_PORT` | Port MySQL | `3306` |
| `DB_NAME` | Nom de la base de données | `appdb` |
| `DB_USER` | Utilisateur MySQL | `root` |
| `DB_PASSWORD` | Mot de passe MySQL | `password` |
| `PORT` | Port du serveur API | `3000` |

#### Frontend (`.env` ou `.env.local`)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `VITE_API_URL` | URL de l'API backend | `http://localhost:3000` |

### Configuration Vite

Le fichier `vite.config.ts` configure :
- Port du serveur de développement : **8080**
- Alias `@` pour le dossier `src`
- Plugin React avec SWC pour une compilation rapide

## 📁 Structure du projet

```
dspi-tech-employee-hub/
├── Docs_Config/              # Documentation et scripts
│   ├── bd.sql               # Script de création de la base de données
│   ├── Architecture.png     # Diagramme d'architecture
│   ├── Deploy_VM.ps1       # Script de déploiement PowerShell
│   └── docker.sh           # Script Docker
├── public/                   # Fichiers statiques
│   ├── favicon.ico
│   └── robots.txt
├── server/                   # Backend Express
│   ├── db.js                # Configuration de la connexion MySQL
│   └── index.js              # Serveur API Express
├── src/                      # Code source frontend
│   ├── components/          # Composants React
│   │   ├── Layout.tsx      # Layout principal
│   │   ├── NavLink.tsx     # Composant de navigation
│   │   └── ui/             # Composants shadcn/ui
│   ├── data/               # Données statiques
│   │   └── employees.ts    # Types et données d'exemple
│   ├── hooks/              # Hooks React personnalisés
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/                # Utilitaires
│   │   └── utils.ts        # Fonctions utilitaires
│   ├── pages/              # Pages de l'application
│   │   ├── Index.tsx       # Page d'accueil
│   │   ├── Salaries.tsx    # Gestion des salariés
│   │   ├── Nouveau.tsx     # Ajout d'employé
│   │   ├── Contact.tsx      # Formulaire de contact
│   │   └── NotFound.tsx    # Page 404
│   ├── App.tsx             # Composant racine
│   ├── App.css             # Styles globaux
│   ├── index.css           # Styles Tailwind
│   ├── main.tsx            # Point d'entrée
│   └── vite-env.d.ts       # Types Vite
├── .env                     # Variables d'environnement (à créer)
├── package.json            # Dépendances et scripts
├── tsconfig.json           # Configuration TypeScript
├── vite.config.ts          # Configuration Vite
├── tailwind.config.ts      # Configuration Tailwind
└── README.md               # Ce fichier
```

## 🔌 API Endpoints

### Health Check
```
GET /api/health
```
Vérifie l'état du serveur.

**Réponse :**
```json
{
  "status": "ok"
}
```

### Employés

#### Récupérer tous les employés
```
GET /api/employees
```

**Réponse :**
```json
[
  {
    "id": "EMP123456",
    "firstName": "Jean",
    "lastName": "Dupont",
    "email": "jean.dupont@dspi-tech.com",
    "phone": "+33 6 12 34 56 78",
    "department": "IT",
    "position": "Développeur",
    "status": "active",
    "hireDate": "2024-01-15",
    "salary": 50000,
    "avatar": null
  }
]
```

#### Créer un nouvel employé
```
POST /api/employees
```

**Body :**
```json
{
  "id": "EMP123456",
  "firstName": "Jean",
  "lastName": "Dupont",
  "email": "jean.dupont@dspi-tech.com",
  "phone": "+33 6 12 34 56 78",
  "department": "IT",
  "position": "Développeur",
  "status": "active",
  "hireDate": "2024-01-15",
  "salary": 50000,
  "avatar": null
}
```

**Réponse :**
```json
{
  "message": "Employé créé",
  "id": 1
}
```

### Contacts

#### Récupérer tous les contacts
```
GET /api/contact
```

**Réponse :**
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "subject": "Question",
    "message": "Bonjour...",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
]
```

#### Créer un nouveau contact
```
POST /api/contact
```

**Body :**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Question",
  "message": "Bonjour, j'aimerais..."
}
```

**Réponse :**
```json
{
  "message": "Contact créé",
  "id": 1
}
```

## 🗄️ Base de données

### Structure

#### Table `employees`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | VARCHAR(50) | Identifiant unique (PK) |
| `firstName` | VARCHAR(100) | Prénom |
| `lastName` | VARCHAR(100) | Nom |
| `email` | VARCHAR(255) | Email (UNIQUE) |
| `phone` | VARCHAR(50) | Téléphone (nullable) |
| `department` | VARCHAR(100) | Département |
| `position` | VARCHAR(100) | Poste |
| `status` | ENUM | Statut : 'active', 'inactive', 'remote' |
| `hireDate` | DATE | Date d'embauche |
| `salary` | DECIMAL(10,2) | Salaire annuel |
| `avatar` | VARCHAR(255) | URL avatar (nullable) |

#### Table `contact`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | INT | Identifiant auto-incrémenté (PK) |
| `name` | VARCHAR(255) | Nom complet |
| `email` | VARCHAR(255) | Email |
| `subject` | VARCHAR(255) | Sujet |
| `message` | TEXT | Message |
| `created_at` | TIMESTAMP | Date de création (auto) |

### Script SQL

Le script de création de la base de données se trouve dans `Docs_Config/bd.sql`.

Pour créer la base de données :

```bash
mysql -u root -p < Docs_Config/bd.sql
```

## 💻 Utilisation

### Navigation

L'application propose 4 pages principales :

1. **Accueil** (`/`) - Vue d'ensemble et statistiques
2. **Salariés** (`/salaries`) - Liste et gestion des employés
3. **Nouveau** (`/nouveau`) - Formulaire d'ajout d'employé
4. **Contact** (`/contact`) - Formulaire de contact

### Fonctionnalités principales

#### Gestion des salariés
- Utilisez la barre de recherche pour filtrer par nom, email ou poste
- Sélectionnez un département dans le filtre déroulant
- Filtrez par statut (Actif, Remote, Inactif)
- Cliquez sur les en-têtes de colonnes pour trier
- Cliquez sur "Exporter" pour télécharger un CSV

#### Ajout d'employé
- Remplissez tous les champs obligatoires (marqués d'un *)
- Sélectionnez un département et un poste dans les listes déroulantes
- L'ID est généré automatiquement
- Le statut est défini par défaut sur "active"

#### Contact
- Remplissez le formulaire de contact
- Les messages sont enregistrés en base de données
- Utilisez le bouton "Exporter" pour télécharger tous les contacts en CSV

## 📜 Scripts disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Démarre le serveur de développement frontend (port 8080) |
| `npm run server` | Démarre le serveur API backend (port 3000) |
| `npm run dev:full` | Démarre frontend et backend simultanément |
| `npm run build` | Compile l'application pour la production |
| `npm run build:dev` | Compile en mode développement |
| `npm run preview` | Prévisualise la build de production |
| `npm run lint` | Exécute ESLint pour vérifier le code |

## 🚢 Déploiement

### Build de production

```bash
npm run build

```

Les fichiers compilés seront dans le dossier `dist/`.

### Déploiement du backend

Le serveur Express peut être déployé sur :
- **Heroku**
- **Railway**
- **Render**
- **VPS** (avec PM2)
- **Azure App Service**

### Variables d'environnement en production

Assurez-vous de configurer toutes les variables d'environnement nécessaires sur votre plateforme de déploiement.

### Exemple avec PM2

```bash
# Installer PM2
npm install -g pm2

# Démarrer le serveur
pm2 start server/index.js --name "dspi-api"

# Sauvegarder la configuration
pm2 save
```

## 🤝 Contribution

1. Fork le projet
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📝 Notes

- L'application utilise MySQL pour la persistance des données
- Le frontend communique avec l'API via des requêtes HTTP
- Les exports CSV incluent un BOM UTF-8 pour une compatibilité optimale avec Excel
- Les filtres et tris sont appliqués côté client pour une meilleure performance


---



## 📄 Licence

Ce projet est privé et propriétaire de DSPI-TECH.

## 👥 Auteurs

- **DSPI-TECH** - Développement initial

## 🆘 Support

Pour toute question ou problème, contactez l'équipe DSPI-TECH.




