const express = require('express');
const router = express.Router();

// Mock asset data
const assets = {
  accounts: [
    { id: 'A101', name: 'Savings Account', type: 'Savings', balance: 5000 },
    { id: 'A102', name: 'Checking Account', type: 'Checking', balance: 1200 }
  ],
  branches: [
    { id: 'B001', name: 'Main Branch', location: 'New York' },
    { id: 'B002', name: 'West Branch', location: 'California' }
  ],
  creditCards: [
    { id: 'C101', type: 'Visa', limit: 10000, holder: 'testuser' },
    { id: 'C102', type: 'MasterCard', limit: 15000, holder: 'adminuser' }
  ],
  loans: [
    { id: 'L201', amount: 20000, status: 'approved' },
    { id: 'L202', amount: 15000, status: 'pending' }
  ],
  payments: [
    { id: 'P301', from: 'A101', to: 'Vendor A', amount: 200 },
    { id: 'P302', from: 'A102', to: 'Vendor B', amount: 300 }
  ],
  investments: [
    { id: 'I401', name: 'Mutual Fund A', amount: 8000 },
    { id: 'I402', name: 'Stock XYZ', amount: 12000 }
  ]
};

// List all asset types
router.get('/', (req, res) => {
  res.json({ message: 'Available asset types', types: Object.keys(assets) });
});

// Get all assets of a specific type
router.get('/:type', (req, res) => {
  const { type } = req.params;
  if (!assets[type]) {
    return res.status(404).json({ error: 'Asset type not found' });
  }
  res.json(assets[type]);
});

// Get single asset by ID
router.get('/:type/:id', (req, res) => {
  const { type, id } = req.params;
  if (!assets[type]) {
    return res.status(404).json({ error: 'Asset type not found' });
  }
  const item = assets[type].find(a => a.id === id);
  item ? res.json(item) : res.status(404).json({ error: 'Asset not found' });
});

module.exports = router;
