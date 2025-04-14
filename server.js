import express from 'express'
import cors from 'cors'
import * as mongodb from './db.js'
import routes from './routes/index.js'

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
        app.use('/', routes);

        app.listen(port, '0.0.0.0',() => {
            console.log(`Server is running on port ${port}`);
        });
    })
    .catch(err => {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    });
