const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

(async () => {
    const dbUser = process.env.DB_USER;
    const dbPassword = process.env.DB_PASSWORD;
    const dbHost = process.env.DB_HOST;
    const dbName = process.env.DB_NAME;

    const url = `mongodb+srv://${dbUser}:${dbPassword}@${dbHost}/${dbName}?retryWrites=true&w=majority`;

    console.info('Conectando ao banco de dados...');

    const client = await MongoClient.connect(url, { useUnifiedTopology: true });

    console.info('MongoDB conectado com sucesso!!');

    const db = client.db(dbName);

    const app = express();

    app.use(express.json());

    // CORS

    app.all('/*', (req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');

        res.header('Access-Control-Allow-Methods', '*');

        res.header(
            'Access-Control-Allow-Headers',
            'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Authorization',
        );

        next();
    });

    app.get('/me', (req, res) => {
        const authorization = req.header('Authorization');

        if (!authorization) {
            res.status(401).send({
                message: `Nenhuma chave de autorização foi encontrada. Certifique-se de que está passando o atributo 'Authorization' no 'Header' com um valor válido.`,
            });

            return;
        }

        const result = {
            welcome: `Olá! Você está acessando a aplicação de backend da Blue feita com muito amor para o módulo Frontend 4.`,
            authorization: `A chave de autorização que você está usando é '${authorization}'.`,
            message:
                'Todas as requisições que você fizer salvarão os dados em uma base exclusiva para essa chave de autorização.',
            warning:
                'Os dados adicionados ao banco de dados dessa aplicação possuem uma duração limitada, portanto, use esse espaço ' +
                'apenas para desenvolvimento.',
        };

        res.send(result);
    });

    const collection = db.collection('main');

    // CRUD (Create, Read, Update, Delete)

    // GET: READ ALL (exibir todos os registros)
    app.get('/', async (req, res) => {
        const authorization = req.header('Authorization');

        if (!authorization) {
            res.status(401).send({
                message: `Nenhuma chave de autorização foi encontrada. Certifique-se de que está passando o atributo 'Authorization' no 'Header' com um valor válido.`,
            });

            return;
        }

        const listaMensagens = await collection
            .find({ authorization })
            .toArray();

        res.send(listaMensagens);
    });

    // GET: READ SINGLE (exibir apenas um registro)
    app.get('/:id', async (req, res) => {
        const authorization = req.header('Authorization');

        if (!authorization) {
            res.status(401).send({
                message: `Nenhuma chave de autorização foi encontrada. Certifique-se de que está passando o atributo 'Authorization' no 'Header' com um valor válido.`,
            });

            return;
        }

        const id = req.params.id;

        const record = await collection.findOne({
            _id: ObjectId(id),
            authorization,
        });

        if (!record) {
            res.status(400).send(
                `Registro com o ID '${id}' não foi encontrado para a chave de autorização '${authorization}'.`,
            );

            return;
        }

        res.send(record);
    });

    // POST: CREATE (criar um registro)
    app.post('/', async (req, res) => {
        const authorization = req.header('Authorization');

        if (!authorization) {
            res.status(401).send({
                message: `Nenhuma chave de autorização foi encontrada. Certifique-se de que está passando o atributo 'Authorization' no 'Header' com um valor válido.`,
            });

            return;
        }

        const record = req.body;

        if (!Object.keys(record).length) {
            res.status(400).send('O corpo da requisição não foi informado.');

            return;
        }

        if (record.length) {
            record.forEach(r => (r.authorization = authorization));

            await collection.insertMany(record);
        } else {
            record.authorization = authorization;
            await collection.insertOne(record);
        }

        res.status(201).send(record);
    });

    // PUT: UPDATE (editar um registro)
    app.put('/:id', async (req, res) => {
        const authorization = req.header('Authorization');

        if (!authorization) {
            res.status(401).send({
                message: `Nenhuma chave de autorização foi encontrada. Certifique-se de que está passando o atributo 'Authorization' no 'Header' com um valor válido.`,
            });

            return;
        }

        const newRecord = req.body;

        if (!Object.keys(newRecord).length) {
            res.status(400).send('O corpo da requisição não foi informado.');

            return;
        }

        const id = req.params.id;

        const record = await collection.findOne({
            _id: ObjectId(id),
            authorization,
        });

        if (!record) {
            res.status(400).send(
                `Registro com o ID '${id}' não foi encontrado para a chave de autorização '${authorization}'.`,
            );

            return;
        }

        newRecord.authorization = authorization;

        await collection.updateOne(
            { _id: ObjectId(id), authorization },
            { $set: newRecord },
        );

        res.send(newRecord);
    });

    // DELETE: DELETE (remover um registro)
    app.delete('/:id', async (req, res) => {
        const authorization = req.header('Authorization');

        if (!authorization) {
            res.status(401).send({
                message: `Nenhuma chave de autorização foi encontrada. Certifique-se de que está passando o atributo 'Authorization' no 'Header' com um valor válido.`,
            });

            return;
        }

        const id = req.params.id;

        const record = await collection.findOne({
            _id: ObjectId(id),
            authorization,
        });

        if (!record) {
            res.status(400).send(
                `Registro com o ID '${id}' não foi encontrado para a chave de autorização '${authorization}'.`,
            );

            return;
        }

        await collection.deleteOne({
            _id: ObjectId(id),
            authorization,
        });

        res.send({ message: 'Operação realizada com sucesso.' });
    });

    // DELETE: DELETE ALL (remover todos os registros)
    app.delete('/', async (req, res) => {
        const authorization = req.header('Authorization');

        if (!authorization) {
            res.status(401).send({
                message: `Nenhuma chave de autorização foi encontrada. Certifique-se de que está passando o atributo 'Authorization' no 'Header' com um valor válido.`,
            });

            return;
        }

        const count = await collection.count({ authorization });

        if (count > 0) {
            await collection.deleteMany({
                authorization,
            });
        }

        res.send({ message: 'Operação realizada com sucesso.', count });
    });

    app.listen(process.env.PORT || 3000);
})();
