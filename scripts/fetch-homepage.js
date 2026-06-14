const http = require('http')
const path = process.argv[2] || '/'
const url = `http://localhost:3001${path}`

http.get(url, (res) => {
  let data = ''
  res.on('data', chunk => data += chunk)
  res.on('end', () => {
    console.log('\n--- RESPONSE START ---\n')
    console.log(data.slice(0, 8000))
    console.log('\n--- RESPONSE END ---\n')
  })
}).on('error', (err) => {
  console.error('Fetch error:', err.message)
  process.exit(1)
})
