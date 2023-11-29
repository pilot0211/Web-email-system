const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const mysql = require('mysql2');
const dbsetup = require('./dbsetup')
const multer = require('multer');
const path = require('path');
var expressLayouts = require('express-ejs-layouts');
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'wpr',
    password: 'fit2023',
    database: 'wpr2023',
  });
  
  connection.connect((err) => {
  });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, path.join(__dirname, 'uploads')); 
  },
  filename: function (req, file, cb) {
      cb(null, file.originalname); 
  },
});


const upload = multer({ storage: storage });


const app = express();
app.use(express.static('public')); 
const port = 8000;
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set("layout extractScripts", true)

app.get('/signin',(req, res) =>{
    res.render('signin',{ extractScripts: true })
})

app.get('/', (req, res) => {
    if (req.cookies.signedInUser) {
        
        res.redirect('/inbox');
    }
    else{

    res.render('signin', { error: 'You are not allow to enter the inbox page' });}
});

app.post('/',(req, res)=>{
    const username = req.body.username
    const password = req.body.password
    const query = 'SELECT * FROM users WHERE fullName = ? AND password = ?';
    connection.query(query, [username, password], (err, results) => {
        if (results.length > 0) {  
            res.cookie('signedInUser', results[0],{
              maxAge: 6000000
            });
            return res.redirect('/inbox');
        }else {
            let searchFullname = 'fullname';
            let searchPassword = 'password';
            let isPresent = false;
            const checkError = 'SELECT fullname, password FROM users'
            connection.query(checkError, (err, rows)=>{
                for (let obj of rows) {
                    if (searchFullname in obj && obj[searchFullname] === username) {
                        if (searchPassword in obj && obj[searchPassword] !== password) {
                            isPresent = true;
                            break;
                        }
                    }
                }
                let error = isPresent ? "Invalid Password" : "Invalid Username";

                res.render('signin', { error });
          })
    }
})
})

app.get('/signup',(req, res) =>{
    res.render('signup')
})

app.post('/signup', (req, res) => {
    const { fullName, email, password, reEnterPassword } = req.body;
    if (!fullName || !email || !password || !reEnterPassword) {
      res.render('signup', { error: 'All fields are required.' });
    }
  
    const checkEmailQuery = 'SELECT * FROM users WHERE email = ?';
    connection.query(checkEmailQuery, [email], (err, results) => {
      if (err) {
        return res.status(500).send('Internal Server Error');
      }
  
      if (results.length > 0) {
        return res.render('signup', { error: 'Email address is already in use.' });
      }
  
      if (password.length < 6) {
        return res.render('signup', { error: 'Password should be at least 6 characters long.' });
      }

      if (password !== reEnterPassword) {
        return res.render('signup', { error: 'Passwords do not match.' });
      }
  
      const insertUserQuery = 'INSERT INTO users (fullName, email, password) VALUES (?, ?, ?)';
      connection.query(insertUserQuery, [fullName, email, password], (err) => {
        if (err) {
          return res.status(500).send('Internal Server Error');
        }
  
        res.render('welcome', { fullName });
      });
    });
  });

app.get('/inbox', (req, res)=> {
    const signedInUser = req.cookies.signedInUser;
    let { page, limit} = req.query;
    page = parseInt(page)
    limit = parseInt(limit)
    if (!page) page =1;
    if(!limit) limit = 5;
    let offset = (page -1) *limit;
    if (signedInUser){
      const selectEmail =connection.query('SELECT COUNT(*) AS emailCount FROM emails JOIN users ON emails.senderId = users.id JOIN users u ON emails.recipientId = u.id WHERE u.fullName = ?',[signedInUser.fullname],(err, countEmail)=>{
          const numberOfEmail = countEmail[0].emailCount;
          const data = 'SELECT emails.*, users.fullName AS senderName, u.fullName AS recipientName FROM emails JOIN users ON emails.senderId = users.id JOIN users u ON emails.recipientId = u.id WHERE u.fullName = ? LIMIT ? OFFSET ?'
          connection.query(data, [signedInUser.fullname, limit, offset], (err, rows)=>{
              const totalPages = Math.ceil(numberOfEmail/ limit);
              res.render('inboxpage', { rows ,currentPage: page, totalPages: totalPages, limit: limit, signedInUser})
        })
      })
        }else{
          const errorMessage = 'You do not have permission to access this page.';
          res.status(403).render('error403', { errorMessage });
        }
    
  
})

app.get('/compose', (req, res)=>{
  const signedInUser = req.cookies.signedInUser;
  const successMessage = req.query.success === 'true' ? 'The email is sent successfully.' : null;
  if (signedInUser){
    const selectFullname = 'SELECT id, fullName FROM users'
    connection.query(selectFullname, (err, rows)=>{
      res.render('compose', {rows, signedInUser: signedInUser, message: successMessage})
    })
  }else{
    const errorMessage = 'You do not have permission to access this page.';
    res.status(403).render('error403', { errorMessage });
  }
})

app.post('/compose', upload.single('attachment'), (req, res) => {
  const signedInUser = req.cookies.signedInUser;
  const { recipient, subject, body } = req.body;
  const attachment = req.file ? req.file.filename : null;
  if (signedInUser) {
    const addNewEmail = 'INSERT INTO emails (senderId, recipientId, subject, body, attachment) VALUES (?, ?, ?, ?, ?);';
    connection.query(addNewEmail, [signedInUser.id, recipient, subject, body, attachment], (err) => {
      if (err) {
        const errorMessage = 'Something went wrong';
        return res.status(403).render('error403', { errorMessage });
      }
      
      return res.redirect('/compose?success=true');
    });
  } else {
    const errorMessage = 'You do not have permission to access this page.';
    return res.status(403).render('error403', { errorMessage });
  }
});


app.get('/outbox', (req, res)=> {
  const signedInUser = req.cookies.signedInUser;
  let { page, limit} = req.query;
  page = parseInt(page)
  limit = parseInt(limit)
  if (!page) page =1;
  if(!limit) limit = 5;
  let offset = (page -1) *limit;
  if (signedInUser){
    const selectEmail =connection.query('SELECT COUNT(*) AS emailCount FROM emails JOIN users ON emails.recipientId = users.id JOIN users u ON emails.senderId = u.id WHERE u.fullName = ?',[signedInUser.fullname],(err, countEmail)=>{
        const numberOfEmail = countEmail[0].emailCount;
        const data = 'SELECT emails.*, users.fullName AS recipientName , u.fullName AS senderName FROM emails JOIN users ON emails.recipientId = users.id JOIN users u ON emails.senderId = u.id WHERE u.fullName = ? LIMIT ? OFFSET ?'
        connection.query(data, [signedInUser.fullname, limit, offset], (err, rows)=>{
            const totalPages = Math.ceil(numberOfEmail/ limit);
            res.render('outboxpage', { rows ,currentPage: page, totalPages: totalPages, limit: limit, signedInUser})
      })
    })
      }else{
        const errorMessage = 'You do not have permission to access this page.';
        res.status(403).render('error403', { errorMessage });
      }
})

app.get('/email/:id', (req, res) => {
  const signedInUser = req.cookies.signedInUser;
  const emailId = req.params.id;

  if (signedInUser) {
    
    const selectEmailDetails = `
      SELECT emails.*, users.fullName AS senderName, u.fullName AS recipientName
      FROM emails
      JOIN users ON emails.senderId = users.id
      JOIN users u ON emails.recipientId = u.id
      WHERE (emails.senderId = ? OR emails.recipientId = ?) AND emails.id = ?
    `;

    connection.query(selectEmailDetails, [signedInUser.id, signedInUser.id, emailId], (err, rows) => {
      if (err || rows.length === 0) {
        const errorMessage = 'Email not found';
        res.status(404).render('error404', { errorMessage });
      } else {
        res.render('emailDetail', { email: rows[0], signedInUser });
      }
    });
  } else {
    const errorMessage = 'You do not have permission to access this page.';
    res.status(403).render('error403', { errorMessage });
  }
});

app.get('/download/:id', (req, res) => {
  const emailId = req.params.id;

  const selectAttachmentPath = 'SELECT attachment FROM emails WHERE id = ?';

  connection.query(selectAttachmentPath, [emailId], (err, rows) => {
      if (err) {
          const errorMessage = 'Error fetching attachment details.';
          return res.status(500).render('error500', { errorMessage });
      }

      if (rows.length === 0 || !rows[0].attachment) {
          const errorMessage = 'Attachment not found.';
          return res.status(404).render('error404', { errorMessage });
      }

      const attachmentFilename = rows[0].attachment;

      const attachmentPath = path.resolve(__dirname, 'uploads', attachmentFilename);

      res.download(attachmentPath, attachmentFilename, (err) => {
          if (err) {
              const errorMessage = 'Error downloading attachment.';
              return res.status(500).render('error500', { errorMessage });
          }
      });
  });
});


app.post('/api/delete-emails', (req, res) => {
  const { emailIds } = req.body;
  res.json({ success: true });
});

app.post('/signout', (req, res) => {
  res.clearCookie('signedInUser');
  res.json({ success: true });
});



app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
