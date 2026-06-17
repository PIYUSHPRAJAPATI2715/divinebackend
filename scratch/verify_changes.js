try {
  const donorPortalRoutes = require('../routes/donors');
  console.log('donorPortalRoutes export keys:', Object.keys(donorPortalRoutes));
  console.log('donorPortalRoutes type:', typeof donorPortalRoutes);
  console.log('donorPortalRoutes stack:', donorPortalRoutes.stack ? 'Router Staged' : 'Undefined');
} catch (err) {
  console.error('Import error:', err.message);
}
