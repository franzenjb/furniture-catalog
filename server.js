const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const cheerio = require('cheerio');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });

const db = new sqlite3.Database('./furniture.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS furniture (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    notes TEXT,
    image_url TEXT,
    price TEXT,
    store TEXT,
    category TEXT,
    quantity INTEGER DEFAULT 1,
    room TEXT,
    room_number INTEGER,
    bookmark_folder TEXT,
    date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
    favorite BOOLEAN DEFAULT 0
  )`);
});

app.get('/api/furniture', (req, res) => {
  const { search, category, favorite } = req.query;
  let query = 'SELECT * FROM furniture WHERE 1=1';
  const params = [];
  
  if (search) {
    query += ' AND (title LIKE ? OR notes LIKE ? OR store LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  
  if (favorite === 'true') {
    query += ' AND favorite = 1';
  }
  
  query += ' ORDER BY date_modified DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/furniture/:id', (req, res) => {
  db.get('SELECT * FROM furniture WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json(row);
  });
});

app.post('/api/furniture', async (req, res) => {
  const { title, url, notes, price, store, category } = req.body;
  
  let imageUrl = '';
  try {
    const response = await axios.get(url, { timeout: 5000 });
    const $ = cheerio.load(response.data);
    
    imageUrl = $('meta[property="og:image"]').attr('content') ||
               $('meta[name="twitter:image"]').attr('content') ||
               $('img').first().attr('src') ||
               '';
    
    if (imageUrl && !imageUrl.startsWith('http')) {
      const baseUrl = new URL(url);
      imageUrl = baseUrl.origin + imageUrl;
    }
  } catch (error) {
    console.log('Could not fetch image:', error.message);
  }
  
  const stmt = db.prepare(`INSERT INTO furniture 
    (title, url, notes, image_url, price, store, category) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  
  stmt.run(title, url, notes, imageUrl, price, store, category, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ 
      id: this.lastID,
      title,
      url,
      notes,
      image_url: imageUrl,
      price,
      store,
      category
    });
  });
  
  stmt.finalize();
});

app.put('/api/furniture/:id', (req, res) => {
  const { title, url, notes, price, store, category, favorite, quantity, room, room_number } = req.body;
  const id = req.params.id;
  
  const stmt = db.prepare(`UPDATE furniture 
    SET title = ?, url = ?, notes = ?, price = ?, store = ?, 
        category = ?, favorite = ?, quantity = ?, room = ?, room_number = ?,
        date_modified = CURRENT_TIMESTAMP 
    WHERE id = ?`);
  
  stmt.run(
    title, url, notes, price, store, category, 
    favorite ? 1 : 0, quantity || 1, room, room_number, id, 
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      res.json({ message: 'Updated successfully' });
    }
  );
  
  stmt.finalize();
});

app.delete('/api/furniture/:id', (req, res) => {
  db.run('DELETE FROM furniture WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json({ message: 'Deleted successfully' });
  });
});

app.post('/api/import-bookmarks', upload.single('bookmarks'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const filePath = req.file.path;
  const fileContent = fs.readFileSync(filePath, 'utf8');
  fs.unlinkSync(filePath);
  
  const $ = cheerio.load(fileContent);
  const bookmarks = [];
  
  // Function to recursively parse bookmark structure with folder information
  function parseBookmarks(element, currentFolder = '') {
    $(element).children('dt').each((index, dt) => {
      const $dt = $(dt);
      const $h3 = $dt.children('h3').first();
      
      if ($h3.length > 0) {
        // This is a folder
        const folderName = $h3.text().trim();
        const $dl = $dt.children('dl').first();
        
        if ($dl.length > 0) {
          // Parse bookmarks inside this folder
          parseBookmarks($dl, folderName);
        }
      } else {
        // This is a bookmark
        const $a = $dt.children('a').first();
        if ($a.length > 0) {
          const url = $a.attr('href');
          const title = $a.text().trim();
          
          if (url && title && url.startsWith('http')) {
            bookmarks.push({ 
              title, 
              url, 
              folder: currentFolder 
            });
          }
        }
      }
    });
  }
  
  // Start parsing from the main DL element
  parseBookmarks($('dl').first());
  
  // Filter for specific folder if requested
  const targetFolder = '9 - Bayview Furnishings';
  const filteredBookmarks = bookmarks.filter(b => 
    b.folder === targetFolder || b.folder.includes('Bayview')
  );
  
  // Use filtered bookmarks if found, otherwise use all
  const bookmarksToImport = filteredBookmarks.length > 0 ? filteredBookmarks : bookmarks;
  
  let imported = 0;
  const errors = [];
  
  for (const bookmark of bookmarksToImport) {
    try {
      let imageUrl = '';
      let store = '';
      
      try {
        const response = await axios.get(bookmark.url, { timeout: 5000 });
        const $ = cheerio.load(response.data);
        
        imageUrl = $('meta[property="og:image"]').attr('content') ||
                   $('meta[name="twitter:image"]').attr('content') ||
                   $('img').first().attr('src') ||
                   '';
        
        if (imageUrl && !imageUrl.startsWith('http')) {
          const baseUrl = new URL(bookmark.url);
          imageUrl = baseUrl.origin + imageUrl;
        }
        
        const urlObj = new URL(bookmark.url);
        store = urlObj.hostname.replace('www.', '');
      } catch (error) {
        console.log('Could not fetch details for:', bookmark.url);
      }
      
      await new Promise((resolve, reject) => {
        const stmt = db.prepare(`INSERT INTO furniture 
          (title, url, image_url, store, category, bookmark_folder) 
          VALUES (?, ?, ?, ?, ?, ?)`);
        
        stmt.run(
          bookmark.title, 
          bookmark.url, 
          imageUrl, 
          store, 
          bookmark.folder || 'Imported',
          bookmark.folder,
          function(err) {
            if (err) {
              reject(err);
            } else {
              imported++;
              resolve();
            }
          }
        );
        
        stmt.finalize();
      });
      
    } catch (error) {
      errors.push({ bookmark: bookmark.title, error: error.message });
    }
  }
  
  const folderMessage = filteredBookmarks.length > 0 
    ? ` from "${targetFolder}" folder` 
    : '';
  
  res.json({ 
    message: `Imported ${imported} of ${bookmarksToImport.length} bookmarks${folderMessage}`,
    totalFound: bookmarks.length,
    fromFolder: filteredBookmarks.length > 0 ? targetFolder : null,
    errors: errors.length > 0 ? errors : undefined
  });
});

app.get('/api/categories', (req, res) => {
  db.all('SELECT DISTINCT category FROM furniture WHERE category IS NOT NULL ORDER BY category', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows.map(r => r.category));
  });
});

app.get('/api/budget', (req, res) => {
  const query = `
    SELECT 
      *,
      CAST(REPLACE(REPLACE(REPLACE(price, '$', ''), ',', ''), ' ', '') AS REAL) as price_numeric,
      CAST(REPLACE(REPLACE(REPLACE(price, '$', ''), ',', ''), ' ', '') AS REAL) * quantity as line_total
    FROM furniture 
    WHERE price IS NOT NULL AND price != ''
  `;
  
  db.all(query, (err, items) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Calculate totals
    const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const totalCost = items.reduce((sum, item) => sum + (item.line_total || 0), 0);
    
    // Group by room
    const byRoom = {};
    items.forEach(item => {
      const room = item.room || 'Unassigned';
      if (!byRoom[room]) {
        byRoom[room] = {
          items: [],
          totalCost: 0,
          itemCount: 0
        };
      }
      byRoom[room].items.push(item);
      byRoom[room].totalCost += item.line_total || 0;
      byRoom[room].itemCount += item.quantity || 1;
    });
    
    res.json({
      totalItems,
      totalCost,
      byRoom,
      items
    });
  });
});

app.get('/api/rooms', (req, res) => {
  db.all('SELECT DISTINCT room FROM furniture WHERE room IS NOT NULL ORDER BY room', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows.map(r => r.room));
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});