# 🚀 Quick Start Guide - Enhanced URL Shortener

## Option 1: Try Improved Version (Recommended)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Improved Server
```bash
node server-improved.js
```

### Step 3: Open Browser
Navigate to: `http://localhost:3000`

---

## Option 2: Replace Original Files

### Step 1: Backup Original Files
```bash
cp server.js server-original.js
cp public/index.html public/index-original.html
cp public/styles.css public/styles-original.css
```

### Step 2: Replace with Improved Version
```bash
cp server-improved.js server.js
cp public/index-improved.html public/index.html
cp public/styles-improved.css public/styles.css
cp package-improved.json package.json
```

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Start Server
```bash
npm start
```

---

## Option 3: Run Both Versions Simultaneously

### Terminal 1 - Original Version
```bash
node server.js
# Runs on http://localhost:3000
```

### Terminal 2 - Improved Version
```bash
PORT=3001 node server-improved.js
# Runs on http://localhost:3001
```

---

## 🎯 First Things to Try

### 1. Create a Simple Short URL
- Go to the "Shorten" tab
- Enter: `https://github.com`
- Click "Shorten URL"
- Copy and test the short URL

### 2. Create a Custom URL
- Enter: `https://google.com`
- Custom Alias: `search`
- Click "Shorten URL"
- Your URL: `localhost:3000/search`

### 3. Create an Expiring URL
- Enter any long URL
- Set "Expires In" to "1 Hour"
- The URL will stop working after 1 hour

### 4. View Analytics
- Create a URL
- Click it 3-4 times
- Click the "📊 Stats" button
- See your click analytics!

### 5. Try the Search Feature
- Switch to "Search" tab
- Type any keyword from your URLs
- See instant results

### 6. Manage Your URLs
- Switch to "My URLs" tab
- See all your shortened URLs
- Try copy, stats, or delete actions

---

## 🧪 Test All Features

### Basic Features
```bash
# Test 1: Simple shortening
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl":"https://example.com"}'

# Test 2: Custom alias
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl":"https://github.com","customAlias":"gh"}'

# Test 3: Get stats
curl http://localhost:3000/stats/gh

# Test 4: List URLs
curl http://localhost:3000/list

# Test 5: Search
curl http://localhost:3000/search?q=github
```

### Advanced Features
```bash
# Test 6: With expiration (1 hour)
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl":"https://example.com","expiresIn":3600}'

# Test 7: With password
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl":"https://secret.com","password":"mysecret"}'

# Test 8: With title and description
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl":"https://blog.com","title":"My Blog","description":"Personal blog"}'

# Test 9: Delete URL
curl -X DELETE http://localhost:3000/delete/gh

# Test 10: Verify password
curl -X POST http://localhost:3000/verify/abc123 \
  -H "Content-Type: application/json" \
  -d '{"password":"mysecret"}'
```

---

## 📊 What You Get

### New Features (20+)
✅ Custom aliases for memorable URLs
✅ URL expiration (auto-cleanup)
✅ Password protection
✅ Click analytics & tracking
✅ QR code generation
✅ Rate limiting (anti-abuse)
✅ Search functionality
✅ URL management dashboard
✅ Soft delete (preserve history)
✅ Beautiful modern UI
✅ Mobile responsive design
✅ One-click copy to clipboard
✅ Statistics modal with charts
✅ Title & description metadata
✅ Multiple database tables
✅ Enhanced error handling
✅ Duplicate detection
✅ Pagination support
✅ Top referrers tracking
✅ Recent clicks history

### API Endpoints
- `POST /shorten` - Create short URL
- `GET /:shortCode` - Redirect to long URL
- `GET /stats/:shortCode` - Get analytics
- `GET /list` - List all URLs (paginated)
- `GET /search` - Search URLs
- `DELETE /delete/:shortCode` - Delete URL
- `POST /verify/:shortCode` - Verify password

---

## 🔧 Configuration

### Change Port
```bash
PORT=8080 node server-improved.js
```

### Change Database File
Edit in `server-improved.js`:
```javascript
const DB_FILE = 'my-urls.db';
```

### Adjust Rate Limiting
Edit in `server-improved.js`:
```javascript
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10;       // 10 requests
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Try different port
PORT=3001 node server-improved.js
```

### Database Locked
```bash
# Stop server and delete .db file
rm shortener.db
# Restart server (will create new DB)
```

### Dependencies Missing
```bash
npm install
```

### Old Browser Issues
- Use Chrome, Firefox, or Edge (latest versions)
- QR code needs modern browser features

---

## 📚 Next Steps

1. Read `IMPROVEMENTS.md` for full documentation
2. Test all features in the UI
3. Try the API with Postman or curl
4. Customize the code for your needs
5. Deploy to production (see deployment guide)

---

## 🎨 Customization Ideas

### Change Color Scheme
Edit `public/styles-improved.css`:
```css
/* Line 8: Change gradient colors */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Add Your Logo
Edit `public/index-improved.html`:
```html
<h1 class="logo">🔗 Your Brand Name</h1>
```

### Change Short Code Length
Edit `server-improved.js`:
```javascript
// Line 67
function generateShortCode(length = 8) { // Change from 6 to 8
```

---

## 🚀 Deploy to Production

### Environment Variables
```bash
export PORT=80
export NODE_ENV=production
export DB_FILE=/data/urls.db
```

### Using PM2 (recommended)
```bash
npm install -g pm2
pm2 start server-improved.js --name url-shortener
pm2 save
pm2 startup
```

### Using Docker
```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["node", "server-improved.js"]
```

---

## 📞 Need Help?

1. Check `IMPROVEMENTS.md` for detailed documentation
2. Review inline code comments in `server-improved.js`
3. Test API endpoints with examples above
4. Common issues are usually:
   - Port conflicts → Use different port
   - Missing dependencies → Run `npm install`
   - Database issues → Delete and recreate DB

---

**Happy URL Shortening! 🎉**

For more information, see:
- `IMPROVEMENTS.md` - Complete feature documentation
- `server-improved.js` - Backend implementation
- `public/index-improved.html` - Frontend UI
- `public/styles-improved.css` - Styling