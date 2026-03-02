import('./server.js').then(() => {
  setTimeout(async () => {
    console.log('Testing /api/route...');
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
      console.log('Response:', text.substring(0, 300));
    } catch (err) {
      console.error('Error:', err.message);
    }
    process.exit(0);
  }, 1000);
}).catch(err => {
  console.error('Server error:', err.message);
  process.exit(1);
});
