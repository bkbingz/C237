const connection = mysql.createConnection({
    host: 'l8259z.h.filess.io',
    user: 'C237DatabaseTeam4_important',
    password: '12c7924fce1143c2b7153cd4d02af4a9bdae651a',
    database: 'C237DatabaseTeam4_important'
  });

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

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

