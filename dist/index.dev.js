"use strict";

var express = require('express');

var bodyParser = require('body-parser');

var cookieParser = require('cookie-parser');

var mysql = require('mysql2');

var dbsetup = require('./dbsetup');

var multer = require('multer');

var path = require('path');

var expressLayouts = require('express-ejs-layouts');

var connection = mysql.createConnection({
  host: 'localhost',
  user: 'wpr',
  password: 'fit2023',
  database: 'wpr2023'
});
connection.connect(function (err) {});
var storage = multer.diskStorage({
  destination: function destination(req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function filename(req, file, cb) {
    cb(null, file.originalname);
  }
});
var upload = multer({
  storage: storage
});
var app = express();
app.use(express.static('public'));
var port = 8000;
app.use(express.urlencoded({
  extended: true
}));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set("layout extractScripts", true);
app.get('/signin', function (req, res) {
  res.render('signin', {
    extractScripts: true
  });
});
app.get('/', function (req, res) {
  if (req.cookies.signedInUser) {
    res.redirect('/inbox');
  } else {
    res.render('signin', {
      error: 'You are not allow to enter the inbox page'
    });
  }
});
app.post('/', function (req, res) {
  var username = req.body.username;
  var password = req.body.password;
  var query = 'SELECT * FROM users WHERE fullName = ? AND password = ?';
  connection.query(query, [username, password], function (err, results) {
    if (results.length > 0) {
      res.cookie('signedInUser', results[0], {
        maxAge: 6000000
      });
      return res.redirect('/inbox');
    } else {
      var searchFullname = 'fullname';
      var searchPassword = 'password';
      var isPresent = false;
      var checkError = 'SELECT fullname, password FROM users';
      connection.query(checkError, function (err, rows) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = rows[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var obj = _step.value;

            if (searchFullname in obj && obj[searchFullname] === username) {
              if (searchPassword in obj && obj[searchPassword] !== password) {
                isPresent = true;
                break;
              }
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return != null) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        var error = isPresent ? "Invalid Password" : "Invalid Username";
        res.render('signin', {
          error: error
        });
      });
    }
  });
});
app.get('/signup', function (req, res) {
  res.render('signup');
});
app.post('/signup', function (req, res) {
  var _req$body = req.body,
      fullName = _req$body.fullName,
      email = _req$body.email,
      password = _req$body.password,
      reEnterPassword = _req$body.reEnterPassword;

  if (!fullName || !email || !password || !reEnterPassword) {
    res.render('signup', {
      error: 'All fields are required.'
    });
  }

  var checkEmailQuery = 'SELECT * FROM users WHERE email = ?';
  connection.query(checkEmailQuery, [email], function (err, results) {
    if (err) {
      return res.status(500).send('Internal Server Error');
    }

    if (results.length > 0) {
      return res.render('signup', {
        error: 'Email address is already in use.'
      });
    }

    if (password.length < 6) {
      return res.render('signup', {
        error: 'Password should be at least 6 characters long.'
      });
    }

    if (password !== reEnterPassword) {
      return res.render('signup', {
        error: 'Passwords do not match.'
      });
    }

    var insertUserQuery = 'INSERT INTO users (fullName, email, password) VALUES (?, ?, ?)';
    connection.query(insertUserQuery, [fullName, email, password], function (err) {
      if (err) {
        return res.status(500).send('Internal Server Error');
      }

      res.render('welcome', {
        fullName: fullName
      });
    });
  });
});
app.get('/inbox', function (req, res) {
  var signedInUser = req.cookies.signedInUser;
  var _req$query = req.query,
      page = _req$query.page,
      limit = _req$query.limit;
  page = parseInt(page);
  limit = parseInt(limit);
  if (!page) page = 1;
  if (!limit) limit = 5;
  var offset = (page - 1) * limit;

  if (signedInUser) {
    var selectEmail = connection.query('SELECT COUNT(*) AS emailCount FROM emails JOIN users ON emails.senderId = users.id JOIN users u ON emails.recipientId = u.id WHERE u.fullName = ?', [signedInUser.fullname], function (err, countEmail) {
      var numberOfEmail = countEmail[0].emailCount;
      var data = 'SELECT emails.*, users.fullName AS senderName, u.fullName AS recipientName FROM emails JOIN users ON emails.senderId = users.id JOIN users u ON emails.recipientId = u.id WHERE u.fullName = ? LIMIT ? OFFSET ?';
      connection.query(data, [signedInUser.fullname, limit, offset], function (err, rows) {
        var totalPages = Math.ceil(numberOfEmail / limit);
        res.render('inboxpage', {
          rows: rows,
          currentPage: page,
          totalPages: totalPages,
          limit: limit,
          signedInUser: signedInUser
        });
      });
    });
  } else {
    var errorMessage = 'You do not have permission to access this page.';
    res.status(403).render('error403', {
      errorMessage: errorMessage
    });
  }
});
app.get('/compose', function (req, res) {
  var signedInUser = req.cookies.signedInUser;
  var successMessage = req.query.success === 'true' ? 'The email is sent successfully.' : null;

  if (signedInUser) {
    var selectFullname = 'SELECT id, fullName FROM users';
    connection.query(selectFullname, function (err, rows) {
      res.render('compose', {
        rows: rows,
        signedInUser: signedInUser,
        message: successMessage
      });
    });
  } else {
    var errorMessage = 'You do not have permission to access this page.';
    res.status(403).render('error403', {
      errorMessage: errorMessage
    });
  }
});
app.post('/compose', upload.single('attachment'), function (req, res) {
  var signedInUser = req.cookies.signedInUser;
  var _req$body2 = req.body,
      recipient = _req$body2.recipient,
      subject = _req$body2.subject,
      body = _req$body2.body;
  var attachment = req.file ? req.file.filename : null;

  if (signedInUser) {
    var addNewEmail = 'INSERT INTO emails (senderId, recipientId, subject, body, attachment) VALUES (?, ?, ?, ?, ?);';
    connection.query(addNewEmail, [signedInUser.id, recipient, subject, body, attachment], function (err) {
      if (err) {
        var errorMessage = 'Something went wrong';
        return res.status(403).render('error403', {
          errorMessage: errorMessage
        });
      }

      return res.redirect('/compose?success=true');
    });
  } else {
    var errorMessage = 'You do not have permission to access this page.';
    return res.status(403).render('error403', {
      errorMessage: errorMessage
    });
  }
});
app.get('/outbox', function (req, res) {
  var signedInUser = req.cookies.signedInUser;
  var _req$query2 = req.query,
      page = _req$query2.page,
      limit = _req$query2.limit;
  page = parseInt(page);
  limit = parseInt(limit);
  if (!page) page = 1;
  if (!limit) limit = 5;
  var offset = (page - 1) * limit;

  if (signedInUser) {
    var selectEmail = connection.query('SELECT COUNT(*) AS emailCount FROM emails JOIN users ON emails.recipientId = users.id JOIN users u ON emails.senderId = u.id WHERE u.fullName = ?', [signedInUser.fullname], function (err, countEmail) {
      var numberOfEmail = countEmail[0].emailCount;
      var data = 'SELECT emails.*, users.fullName AS recipientName , u.fullName AS senderName FROM emails JOIN users ON emails.recipientId = users.id JOIN users u ON emails.senderId = u.id WHERE u.fullName = ? LIMIT ? OFFSET ?';
      connection.query(data, [signedInUser.fullname, limit, offset], function (err, rows) {
        var totalPages = Math.ceil(numberOfEmail / limit);
        res.render('outboxpage', {
          rows: rows,
          currentPage: page,
          totalPages: totalPages,
          limit: limit,
          signedInUser: signedInUser
        });
      });
    });
  } else {
    var errorMessage = 'You do not have permission to access this page.';
    res.status(403).render('error403', {
      errorMessage: errorMessage
    });
  }
});
app.get('/email/:id', function (req, res) {
  var signedInUser = req.cookies.signedInUser;
  var emailId = req.params.id;

  if (signedInUser) {
    var selectEmailDetails = "\n      SELECT emails.*, users.fullName AS senderName, u.fullName AS recipientName\n      FROM emails\n      JOIN users ON emails.senderId = users.id\n      JOIN users u ON emails.recipientId = u.id\n      WHERE (emails.senderId = ? OR emails.recipientId = ?) AND emails.id = ?\n    ";
    connection.query(selectEmailDetails, [signedInUser.id, signedInUser.id, emailId], function (err, rows) {
      if (err || rows.length === 0) {
        var errorMessage = 'Email not found';
        res.status(404).render('error404', {
          errorMessage: errorMessage
        });
      } else {
        res.render('emailDetail', {
          email: rows[0],
          signedInUser: signedInUser
        });
      }
    });
  } else {
    var errorMessage = 'You do not have permission to access this page.';
    res.status(403).render('error403', {
      errorMessage: errorMessage
    });
  }
});
app.get('/download/:id', function (req, res) {
  var emailId = req.params.id;
  var selectAttachmentPath = 'SELECT attachment FROM emails WHERE id = ?';
  connection.query(selectAttachmentPath, [emailId], function (err, rows) {
    if (err) {
      var errorMessage = 'Error fetching attachment details.';
      return res.status(500).render('error500', {
        errorMessage: errorMessage
      });
    }

    if (rows.length === 0 || !rows[0].attachment) {
      var _errorMessage = 'Attachment not found.';
      return res.status(404).render('error404', {
        errorMessage: _errorMessage
      });
    }

    var attachmentFilename = rows[0].attachment;
    var attachmentPath = path.resolve(__dirname, 'uploads', attachmentFilename);
    res.download(attachmentPath, attachmentFilename, function (err) {
      if (err) {
        var _errorMessage2 = 'Error downloading attachment.';
        return res.status(500).render('error500', {
          errorMessage: _errorMessage2
        });
      }
    });
  });
});
app.post('/api/delete-emails', function (req, res) {
  var emailIds = req.body.emailIds;
  res.json({
    success: true
  });
});
app.post('/signout', function (req, res) {
  res.clearCookie('signedInUser');
  res.json({
    success: true
  });
});
app.listen(port, function () {
  console.log("Server is running at http://localhost:".concat(port));
});