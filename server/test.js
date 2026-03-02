import('./server.js').then(() => {
  // Server started, make request after delay
  setTimeout(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locations: [
            {lat: 48.7758, lon: 9.1829},
            {lat: 48.8961, lon: 9.1899}
          ],
          costing: 'bicycle'
        })
      });
      console.log('Response status:', response.status);
      const text = await response.text();
      console.log('Response body:', text.substring(0, 200));
    } catch (err) {
      console.error('Fetch error:', err.message);
    }
    process.exit(0);
  }, 1000);
}).catch(err => {
  console.error('Import error:', err);
  process.exit(1);
});
