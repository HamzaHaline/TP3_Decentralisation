const express = require('express');
const fs = require('fs').promises;
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3002;

app.use(express.json());

let products = [];
let isPrimary = false;

// Chemin du fichier products.json
const productsFilePath = path.join(__dirname, 'products.json');

// Chemin du fichier de journal (log)
const replicationLogPath = path.join(__dirname, 'replicationLog.json');

// Configuration du mécanisme de pulsation (heartbeat)
const heartbeatInterval = 5000; // 5 secondes
const heartbeatUrl = 'http://localhost:3000/heartbeat'; // URL du serveur principal

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

// Route pour la réception des mises à jour du serveur principal
app.post('/replicate', async (req, res) => {
  const { updatedProducts } = req.body;

  // Mettre à jour les produits locaux
  products = updatedProducts;

  // Enregistrer la mise à jour dans le journal (log)
  const replicationLogEntry = {
    timestamp: new Date(),
    updatedProducts,
  };

  try {
    const logData = await fs.readFile(replicationLogPath, 'utf-8');
    const replicationLog = JSON.parse(logData);
    replicationLog.push(replicationLogEntry);
    await fs.writeFile(replicationLogPath, JSON.stringify(replicationLog, null, 2));
  } catch (err) {
    console.error('Error writing to replication log:', err);
  }

  res.json({ message: 'Replication successful' });
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
      // Aucune action spécifique nécessaire pour le serveur miroir
    })
    .catch(async (error) => {
      console.error('Mirror server is unreachable. Initiating asynchronous replication...');

      try {
        const response = await axios.post('http://localhost:3000/replicate', {
          updatedProducts: products,
        });
        console.log(response.data.message);
      } catch (err) {
        console.error('Error during replication:', err.message);
      }
    });
}, heartbeatInterval);

app.listen(PORT, () => {
  console.log(`Mirror Server is running on port ${PORT}`);
});
