const express = require('express');
const fs = require('fs').promises;
const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());

let products = [];
let isPrimary = true;

// Chemin du fichier products.json
const productsFilePath = path.join(__dirname, 'products.json');

// Configuration du mécanisme de pulsation (heartbeat)
const heartbeatInterval = 5000; // 5 secondes
const heartbeatUrl = 'http://localhost:3002/heartbeat'; // URL du serveur miroir

// Fonction pour charger les produits depuis le fichier JSON
const loadProducts = async () => {
  try {
    const data = await fs.readFile(productsFilePath, 'utf-8');
    products = JSON.parse(data);
  } catch (err) {
    console.error('Error reading products file:', err);
  }
};

// Charger les produits au démarrage du serveur
loadProducts();

// Route pour charger initialement les données depuis la base de données principale
app.get('/load-initial-data', async (req, res) => {
  await loadProducts();
  res.json({ message: 'Initial data loaded successfully' });
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/products', (req, res) => {
  res.json(products);
});

app.get('/products/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  const product = products.find(product => product.id === productId);
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ message: 'Product not found' });
  }
});

let orders = [];
app.post('/orders', (req, res) => {
  const { userId, products } = req.body;
  const order = {
    id: orders.length + 1,
    userId,
    products,
    status: 'pending'
  };
  orders.push(order);
  res.json(order);
});

app.get('/orders/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const userOrders = orders.filter(order => order.userId === userId);
  res.json(userOrders);
});

let carts = {};
app.post('/cart/:userId', (req, res) => {
  const { userId } = req.params;
  const { productId, quantity } = req.body;
  if (!carts[userId]) {
    carts[userId] = {};
  }
  carts[userId][productId] = quantity;
  res.json({ message: 'Product added to cart successfully' });
});

app.get('/cart/:userId', (req, res) => {
  const { userId } = req.params;
  if (!carts[userId]) {
    res.json({ message: 'Cart is empty' });
  } else {
    res.json(carts[userId]);
  }
});

app.delete('/cart/:userId/item/:productId', (req, res) => {
  const { userId, productId } = req.params;
  if (carts[userId] && carts[userId][productId]) {
    delete carts[userId][productId];
    res.json({ message: 'Product removed from cart successfully' });
  } else {
    res.status(404).json({ message: 'Product not found in cart' });
  }
});

// Route pour le mécanisme de pulsation (heartbeat)
app.get('/heartbeat', (req, res) => {
  res.sendStatus(200);
});

// Mécanisme de pulsation intervalle
setInterval(() => {
  axios.get(heartbeatUrl)
    .then(response => {
      if (!isPrimary) {
        console.log('Failover completed. This server is now the primary server.');
        isPrimary = true;
      }
    })
    .catch(error => {
      if (isPrimary) {
        console.error('Primary server is unreachable. Initiating failover...');
        initiateFailover();
      }
    });
}, heartbeatInterval);

// Fonction pour activer le basculement automatique
function initiateFailover() {
  console.log('Failover initiated. Redirecting traffic to the mirror server.');
  isPrimary = false;

  // Chemin relatif vers le serveur miroir
  const mirrorServerPath = path.join('C:\\Users\\user\\OneDrive - De Vinci\\Desktop\\semestre 8\\Decentralization techno\\td3\\Part B\\Synchronous_Mirrorin', 'server.js');

  // Démarrer le serveur miroir
  const mirrorServerProcess = spawn('node', [mirrorServerPath]);

  // Gérer la sortie d'erreur du serveur miroir
  mirrorServerProcess.stderr.on('data', (data) => {
    console.error(`Mirror Server stderr: ${data}`);
  });

  // Gérer la fin du processus du serveur miroir
  mirrorServerProcess.on('close', (code) => {
    console.error(`Mirror Server process exited with code ${code}`);
  });
}

app.listen(PORT, () => {
  console.log(`Primary Server is running on port ${PORT}`);
});

