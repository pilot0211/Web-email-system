"use strict";

var mysql = require('mysql2');

var dbConfig = {
  host: 'localhost',
  user: 'wpr',
  password: 'fit2023',
  database: 'wpr2023'
};
var connection = mysql.createConnection(dbConfig);
connection.connect(function (err) {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }

  var createUsersTable = "\n    CREATE TABLE IF NOT EXISTS users (\n      id INT AUTO_INCREMENT PRIMARY KEY,\n      fullName VARCHAR(255) NOT NULL,\n      email VARCHAR(255) UNIQUE NOT NULL,\n      password VARCHAR(255) NOT NULL\n    );\n  ";
  var createEmailsTable = "\n  CREATE TABLE IF NOT EXISTS emails (\n    id INT AUTO_INCREMENT PRIMARY KEY,\n    senderId INT NOT NULL,\n    recipientId INT NOT NULL,\n    subject VARCHAR(255) NOT NULL,\n    body TEXT,\n    attachment VARCHAR(255), \n    timeSent DATETIME,  \n    FOREIGN KEY (senderId) REFERENCES users(id),\n    FOREIGN KEY (recipientId) REFERENCES users(id)\n  );\n";
  var resetUsersAutoIncrement = "\n    ALTER TABLE users AUTO_INCREMENT = 1;\n  ";
  var resetEmailsAutoIncrement = "\n    ALTER TABLE emails AUTO_INCREMENT = 1;\n  ";
  var usersData = [{
    fullName: 'User 1',
    email: 'user1@example.com',
    password: 'password1'
  }, {
    fullName: 'User 2',
    email: 'user2@example.com',
    password: 'password2'
  }, {
    fullName: 'User 3',
    email: 'a@a.com',
    password: 'password3'
  }];
  var emailsData = [{
    senderId: 1,
    recipientId: 3,
    subject: 'Hello',
    body: 'Hi, how are you?',
    attachment: null
  }, {
    senderId: 2,
    recipientId: 3,
    subject: 'Meeting',
    body: 'Let\'s schedule a meeting.',
    attachment: null
  }, {
    senderId: 3,
    recipientId: 1,
    subject: 'Re: Hello',
    body: 'I\'m good, thanks!',
    attachment: null
  }, {
    senderId: 3,
    recipientId: 2,
    subject: 'Re: Meeting',
    body: 'Sure, let me check my calendar.',
    attachment: null
  }];
  connection.query(createUsersTable, function (err) {
    if (err) {
      console.error('Error creating users table:', err);
      return connection.end();
    }

    connection.query(createEmailsTable, function (err) {
      if (err) {
        console.error('Error creating emails table:', err);
        return connection.end();
      }

      connection.query('DELETE FROM users', function (err) {
        if (err) {
          console.error('Error deleting records from users table:', err);
          return connection.end();
        }

        connection.query('DELETE FROM emails', function (err) {
          if (err) {
            console.error('Error deleting records from emails table:', err);
            return connection.end();
          }

          connection.query(resetUsersAutoIncrement, function (err) {
            if (err) {
              console.error('Error resetting users auto-increment:', err);
              return connection.end();
            }

            connection.query(resetEmailsAutoIncrement, function (err) {
              if (err) {
                console.error('Error resetting emails auto-increment:', err);
              }

              var insertUsersQuery = 'INSERT INTO users (fullName, email, password) VALUES ?';
              connection.query(insertUsersQuery, [usersData.map(function (user) {
                return [user.fullName, user.email, user.password];
              })], function (err) {
                if (err) {
                  console.error('Error inserting sample users:', err);
                  return connection.end();
                }

                var insertEmailsQuery = 'INSERT INTO emails (senderId, recipientId, subject, body, attachment) VALUES ?';
                connection.query(insertEmailsQuery, [emailsData.map(function (email) {
                  return [email.senderId, email.recipientId, email.subject, email.body, email.attachment];
                })], function (err) {
                  if (err) {
                    console.error('Error inserting sample emails:', err);
                  }

                  connection.end();
                });
              });
            });
          });
        });
      });
    });
  });
});