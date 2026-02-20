const express = require('express');
const { trace, context, StatusCode } = require('@opentelemetry/api');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = 8081;

// Simulated inventory
const inventory = {
  'SKU123': 10,
  'SKU456': 5,
};

app.get('/health', (req, res) => {
  res.json({ status: 'UP' });
});

app.post('/inventory/reserve', (req, res) => {
  const { items } = req.body;
  const activeSpan = trace.getSpan(context.active());

  // Requirement 10: Custom event "inventory_checked"
  if (activeSpan) {
    activeSpan.addEvent('inventory_checked', { 'items.count': items.length });
  }

  console.log(`Checking inventory for ${items.length} items...`);

  for (const item of items) {
    // Requirement 11: Fail reservation for SKU "OUT-OF-STOCK"
    if (item.sku === 'OUT-OF-STOCK' || !inventory[item.sku] || inventory[item.sku] < item.quantity) {
      console.log(`Item ${item.sku} is out of stock!`);
      
      // Requirement 11: Mark span as error
      if (activeSpan) {
        activeSpan.setStatus({ code: StatusCode.ERROR, message: `Item ${item.sku} out of stock` });
        activeSpan.setAttribute('error', true);
      }

      return res.status(400).json({ message: `Item ${item.sku} out of stock` });
    }
    
    // Reserve item (simulated)
    inventory[item.sku] -= item.quantity;
  }

  res.json({ status: 'RESERVED' });
});

app.listen(PORT, () => {
  console.log(`Inventory Service listening on port ${PORT}`);
});
