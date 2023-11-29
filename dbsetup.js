const mysql = require('mysql2');

const dbConfig = {
  host: 'localhost',
  user: 'wpr',
  password: 'fit2023',
  database: 'wpr2023',
};

const connection = mysql.createConnection(dbConfig);

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }

  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fullName VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL
    );
  `;

  const createEmailsTable = `
  CREATE TABLE IF NOT EXISTS emails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    senderId INT NOT NULL,
    recipientId INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT,
    attachment VARCHAR(255), 
    timeSent DATETIME,  
    FOREIGN KEY (senderId) REFERENCES users(id),
    FOREIGN KEY (recipientId) REFERENCES users(id)
  );
`

  const resetUsersAutoIncrement = `
    ALTER TABLE users AUTO_INCREMENT = 1;
  `;

  const resetEmailsAutoIncrement = `
    ALTER TABLE emails AUTO_INCREMENT = 1;
  `;

  const usersData = [
    { fullName: 'User 1', email: 'user1@example.com', password: 'password1' },
    { fullName: 'User 2', email: 'user2@example.com', password: 'password2' },
    { fullName: 'User 3', email: 'a@a.com', password: 'password3' },
  ];

  const emailsData = [
    { senderId: 1, recipientId: 3, subject: 'Hello', body: 'Hi, how are you?', attachment: null },
    { senderId: 2, recipientId: 3, subject: 'Meeting', body: 'Let\'s schedule a meeting.', attachment: null },
    { senderId: 3, recipientId: 1, subject: 'Re: Hello', body: 'I\'m good, thanks!', attachment: null }, 
    { senderId: 3, recipientId: 2, subject: 'Re: Meeting', body: 'Sure, let me check my calendar.', attachment: null },
    
  ];

  connection.query(createUsersTable, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
      return connection.end();
    }

    connection.query(createEmailsTable, (err) => {
      if (err) {
        console.error('Error creating emails table:', err);
        return connection.end();
      }

      connection.query('DELETE FROM users', (err) => {
        if (err) {
          console.error('Error deleting records from users table:', err);
          return connection.end();
        }

        connection.query('DELETE FROM emails', (err) => {
          if (err) {
            console.error('Error deleting records from emails table:', err);
            return connection.end();
          }

          connection.query(resetUsersAutoIncrement, (err) => {
            if (err) {
              console.error('Error resetting users auto-increment:', err);
              return connection.end();
            }

            connection.query(resetEmailsAutoIncrement, (err) => {
              if (err) {
                console.error('Error resetting emails auto-increment:', err);
              }

              const insertUsersQuery = 'INSERT INTO users (fullName, email, password) VALUES ?';
              connection.query(insertUsersQuery, [usersData.map(user => [user.fullName, user.email, user.password])], (err) => {
                if (err) {
                  console.error('Error inserting sample users:', err);
                  return connection.end();
                }

                const insertEmailsQuery = 'INSERT INTO emails (senderId, recipientId, subject, body, attachment) VALUES ?';
                connection.query(insertEmailsQuery, [emailsData.map(email => [email.senderId, email.recipientId, email.subject, email.body, email.attachment])], (err) => {
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
