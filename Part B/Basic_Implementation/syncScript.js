const fs = require('fs');
const path = require('path');

const sourceFilePath = path.join(__dirname, 'products.json'); // Chemin du fichier JSON sur le serveur principal
const destinationFilePath = path.join('C:\\Users\\user\\OneDrive - De Vinci\\Desktop\\semestre 8\\Decentralization techno\\td3\\Part B\\Synchronous_Mirrorin', 'products.json'); // Chemin du fichier JSON sur le serveur miroir

// Fonction pour copier le fichier source vers la destination
const copyFile = () => {
  fs.copyFile(sourceFilePath, destinationFilePath, (err) => {
    if (err) {
      console.error('Erreur lors de la copie du fichier :', err);
    } else {
      console.log('Fichier copié avec succès.');
    }
  });
};

// Appeler la fonction pour la première synchronisation
copyFile();

// Définir un intervalle pour synchroniser périodiquement (par exemple, toutes les heures)
const syncInterval = 60 * 60 * 1000; // 1 heure
setInterval(copyFile, syncInterval);
