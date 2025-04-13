const express = require('express');
const mongodb = require('./db.js');
const cors = require('cors');

const app = express();

const port = process.env.PORT || 3000;


app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));



app.use(express.json());

mongodb.initDb()
    .then(() => {
        app.use('/', require('./routes'));

        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    })
    .catch(err => {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    });
