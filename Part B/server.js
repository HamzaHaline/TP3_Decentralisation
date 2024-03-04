const express = require('express');
const fs = require('fs').promises;
const app = express();
const PORT = 3000;

app.use(express.json());

let products = [];
fs.readFile('products.json', 'utf-8')
  .then(data => {
    products = JSON.parse(data);
  })
  .catch(err => {
    console.error('Error reading products file:', err);
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
