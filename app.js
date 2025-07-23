req.session.user = {
  username: 'admin',
  role: 'admin' // or 'user'
}

app.get('/addMovie', (req, res) => {
  const user = req.session.user;

  if (!user || user.role !== 'admin') {
    return res.status(403).send('Access denied. Admins only.');
  }

  res.render('addMovie');
});

app.post('/addMovie', upload.single('image'), (req, res) => {
  const user = req.session.user;

  if (!user || user.role !== 'admin') {
    return res.status(403).send('Access denied. Admins only.');
  }

  // Add movie logic here
});

