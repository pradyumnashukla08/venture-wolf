import axios from 'axios';

async function testForecast() {
  try {
    console.log('Sending request to local backend...');
    const response = await axios.post('http://localhost:3000/api/finance/forecast', {
      companyName: 'Test Corp',
      archetype: 'SAAS',
      description: 'A test B2B SaaS startup with a lot of growth.'
    }, {
      headers: {
        'Content-Type': 'application/json'
        // Missing Authorization, we might get 401. 
      }
    });
    console.log('Success:', response.data);
  } catch (err: any) {
    if (err.response) {
      console.error('Error Status:', err.response.status);
      console.error('Error Data:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

testForecast();
