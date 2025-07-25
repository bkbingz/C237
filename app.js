const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const app = express();

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); 
    }
});

const upload = multer({ storage: storage });

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Republic_C207',
    database: 'c237_moviedb'
  });

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Set up view engine
app.set('view engine', 'ejs');
//  enable static files
app.use(express.static('public'));
// enable form processing
app.use(express.urlencoded({
    extended: false
}));

//TO DO: Insert code for Session Middleware below 
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    // Session expires after 1 week of inactivity
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } 
}));

app.use(flash());

// Middleware to check if user is logged in
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this resource');
        res.redirect('/login');
    }
};

// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
    if (req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/home');
    }
};

// Middleware for form validation
const validateRegistration = (req, res, next) => {
    const { username, email, password, address, contact, role } = req.body;

    if (!username || !email || !password || !address || !contact || !role) {
        return res.status(400).send('All fields are required.');
    }
    
    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};

// Define routes
app.get('/',  (req, res) => {
    res.render('index', {user: req.session.user} );
});

app.get('/movieList', checkAuthenticated, checkAdmin, (req, res) => {
    // Fetch data from MySQL
    connection.query('SELECT * FROM movie', (error, results) => {
      if (error) throw error;
      res.render('movieList', { movies: results, user: req.session.user });
    });
});

app.get('/register', (req, res) => {
    res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] });
});

app.post('/register', validateRegistration, (req, res) => {

    const { username, email, password, address, contact, role } = req.body;

    const sql = 'INSERT INTO users (username, email, password, address, contact, role) VALUES (?, ?, SHA1(?), ?, ?, ?)';
    connection.query(sql, [username, email, password, address, contact, role], (err, result) => {
        if (err) {
            throw err;
        }
        console.log(result);
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    });
});

app.get('/login', (req, res) => {
    res.render('login', { messages: req.flash('success'), errors: req.flash('error') });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }

    const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
    connection.query(sql, [email, password], (err, results) => {
        if (err) {
            throw err;
        }

        if (results.length > 0) {
            // Successful login
            req.session.user = results[0]; 
            req.flash('success', 'Login successful!');
            if(req.session.user.role == 'user')
                res.redirect('/home');
            else
                res.redirect('/movielist');
        } else {
            // Invalid credentials
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        }
    });
});

app.get('/home', checkAuthenticated, (req, res) => {
    // Fetch data from MySQL
    connection.query('SELECT * FROM movie', (error, results) => {
        if (error) throw error;
        res.render('home', { user: req.session.user, movies: results });
      });
});

app.post('/watchlist/:id', checkAuthenticated, (req, res) => {
    const movieId = parseInt(req.params.id);
    const quantity = parseInt(req.body.quantity) || 1;

    connection.query('SELECT * FROM movie WHERE movieId = ?', [movieId], (error, results) => {
        if (error) throw error;

        if (results.length > 0) {
            const movie= results[0];

            // Initialize watchlist in session if not exists
            if (!req.session.watchlist) {
                req.session.watchlist = [];
            }

            // Check if watchlist already in cart
            const existingMovie = req.session.watchlist.find(movie => movie.movieId === movieId);
            if (existingMovie) {
                existingMovie.quantity += quantity;
            } else {
                req.session.watchlist.push({
                    movieId: movie.movieId,
                    name: movie.name,
                    rating: movie.rating,
                    review: movie.review,
                    image: movie.image
                });
            }

            res.redirect('/watchlist');
        } else {
            res.status(404).send("Movie not found");
        }
    });
});

app.get('/watchlist', checkAuthenticated, (req, res) => {
    const watchlist = req.session.watchlist || [];
    res.render('watchlist', { watchlist, user: req.session.user });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/movie/:id', checkAuthenticated, (req, res) => {
  // Extract the movie ID from the request parameters
  const movieId = req.params.id;

  // Fetch data from MySQL based on the product ID
  connection.query('SELECT * FROM movie WHERE movieId = ?', [movieId], (error, results) => {
      if (error) throw error;

      // Check if any product with the given ID was found
      if (results.length > 0) {
          // Render HTML page with the product data
          res.render('movie', { movie: results[0], user: req.session.user  });
      } else {
          // If no movie with the given ID was found, render a 404 page or handle it accordingly
          res.status(404).send('Movie not found');
      }
  });
});

app.get('/addMovie', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addMovie', {user: req.session.user } ); 
});

app.post('/addMovie', upload.single('image'),  (req, res) => {
    // Extract product data from the request body
    const { name, rating, review} = req.body;
    let image;
    if (req.file) {
        image = req.file.filename; // Save only the filename
    } else {
        image = null;
    }

    const sql = 'INSERT INTO movie (name, rating, review, image) VALUES (?, ?, ?, ?)';
    // Insert the new product into the database
    connection.query(sql , [name, rating, review, image], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error adding movie:", error);
            res.status(500).send('Error adding movie');
        } else {
            // Send a success response
            res.redirect('/movieList');
        }
    });
});

app.get('/updateMovie/:id',checkAuthenticated, checkAdmin, (req,res) => {
    const movieId = req.params.id;
    const sql = 'SELECT * FROM movie WHERE movieId = ?';

    // Fetch data from MySQL based on the movie ID
    connection.query(sql , [movieId], (error, results) => {
        if (error) throw error;

        // Check if any movie with the given ID was found
        if (results.length > 0) {
            // Render HTML page with the movie data
            res.render('updateMovie', { movie: results[0] });
        } else {
            // If no product with the given ID was found, render a 404 page or handle it accordingly
            res.status(404).send('Movie not found');
        }
    });
});

app.post('/updateMovie/:id', upload.single('image'), (req, res) => {
    const movieId = req.params.id;
    // Extract product data from the request body
    const { name,rating,review } = req.body;
    let image  = req.body.currentImage; //retrieve current image filename
    if (req.file) { //if new image is uploaded
        image = req.file.filename; // set image to be new image filename
    } 

    const sql = 'UPDATE movie SET name = ? , rating = ?, review = ?, image =? WHERE movieId = ?';
    // Insert the new product into the database
    connection.query(sql, [name, rating, review, image, movieId], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error updating movie:", error);
            res.status(500).send('Error updating movie');
        } else {
            // Send a success response
            res.redirect('/movieList');
        }
    });
});

app.get('/deleteMovie/:id', (req, res) => {
    const productId = req.params.id;

    connection.query('DELETE FROM movie WHERE movieId = ?', [productId], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error deleting movie:", error);
            res.status(500).send('Error deleting movie');
        } else {
            // Send a success response
            res.redirect('/movieList');
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
