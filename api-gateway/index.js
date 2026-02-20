const express = require('express');
const axios = require('axios');
const { trace, context } = require('@opentelemetry/api');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = 8080;
const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:8081';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://order-service:8082';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8083';

app.get('/health', (req, res) => {
  res.json({ status: 'UP' });
});

app.post('/api/orders', async (req, res) => {
  const { userId, items, email } = req.body;
  const activeSpan = trace.getSpan(context.active());
  const traceId = activeSpan ? activeSpan.spanContext().traceId : 'unknown';

  try {
    // 1. Call Inventory Service
    console.log(`Checking inventory for user ${userId}...`);
    const inventoryRes = await axios.post(`${INVENTORY_SERVICE_URL}/inventory/reserve`, { items });
    
    if (inventoryRes.status !== 200) {
      throw new Error('Inventory reservation failed');
    }

    // 2. Call Order Service
    console.log(`Creating order for user ${userId}...`);
    const orderRes = await axios.post(`${ORDER_SERVICE_URL}/orders`, { userId, items });
    const orderId = orderRes.data.orderId;

    // 3. Call Notification Service
    console.log(`Sending notification to ${email}...`);
    await axios.post(`${NOTIFICATION_SERVICE_URL}/notify`, { email, orderId });

    res.status(201).json({
      orderId,
      status: 'CREATED',
      traceId
    });
  } catch (error) {
    console.error('Order processing failed:', error.message);
    const status = error.response ? error.response.status : 500;
    res.status(status).json({
      message: 'Order processing failed',
      error: error.message,
      traceId
    });
  }
});

app.listen(PORT, () => {
  console.log(`API Gateway listening on port ${PORT}`);
});
