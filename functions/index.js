const functions = require("firebase-functions");
const express = require("express");
var cors = require('cors')
const axios = require("axios");

const app = express();
app.use(cors());

const token = '6f35674b3fdcc85c416300b6c8fddc3eb7f1bee0';

var admin = require("firebase-admin");
var serviceAccount = require("./db-ghibli-firebase-adminsdk-mee1z-9fe6ea211e.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://db-ghibli-default-rtdb.firebaseio.com"
});

console.log('asds')

app.post('/', async (request, response) => {
    var funcao = request.query.funcao;
    const resposta = await buscandoPost(funcao, request);
    response.send(resposta);
})

const buscandoPost = async (funcao, request) => {

    var autenticar = await autenticar_servidor(request);

    if (autenticar == false) {
        var reposta = {
            status: 'error',
            msg: 'Autenticação inválida'
        }
        return reposta;
    }



    if (funcao == 'cronAtualizarFilmes') {
        let buscar = await cronAtualizarFilmes(request);
        return buscar;
    }

    if (funcao == 'obterFilmes') {
        let buscar = await obterFilmes(request);
        return buscar;
    }


    var reposta = {
        status: 'error',
        msg: 'Parametro inválido'
    }
    return reposta;

}


const obterFilmes = async (request) => {

    try {

        var offset = request.query.offset;
        var limit = request.query.limit;
        var id = request.query.id;

        var filtrar_id = false;

        if (id != null && id != undefined && id != '') {
            filtrar_id = true;
        }

        //padrao 
        if (offset == null || offset == undefined || offset == '') {
            offset = "0";
        }

        //padrao
        if (limit == null || limit == undefined || limit == '') {
            limit = "1000";
        }
        offset = parseInt(offset);
        limit = parseInt(limit);

        if (limit <= 0) {
            limit = 1;
        }

        if (offset <= 0) {
            offset = 0;
        }

        const db = admin.firestore();
        var dados = [];

        if (filtrar_id == true) {


            const consultarBanco = db.collection("filmes")
                .where("id", "==", id)

            const snapshot_filme = await consultarBanco.get();

            snapshot_filme.forEach(doc => {
                dados.push(doc.data())
            });

            return dados

        }

        const first = db.collection('filmes')
            .orderBy('release_date')
            .limit(limit)
            .offset(offset);

        const snapshot = await first.get();

        snapshot.forEach(doc => {
            dados.push(doc.data())
        });

        return dados



    } catch (error) {

        console.log(error);

        var reposta = {
            status: 'error',
            msg: 'Obtivemos um erro ao acessar o banco de dados, tente mais tarde'
        }
        return reposta;
    }

}


const cronAtualizarFilmes = async (request) => {

    try {

        var options = {
            method: 'GET',
            url: 'https://ghibliapi.herokuapp.com/films',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        var getFilmes = await axios.request(options);

        var filmes = getFilmes.data;


        const db = admin.firestore();

        for (var x = 0; x < filmes.length; x++) {
            var id = filmes[x].id;
            const docRef = db.collection('filmes').doc(id);

            var dadosSalvar = {
                id: id,
                title: filmes[x].title,
                original_title: filmes[x].original_title,
                description: filmes[x].description,
                release_date: filmes[x].release_date,
                rt_score: filmes[x].rt_score
            }

            await docRef.set(dadosSalvar);
        }


        return filmes;

    } catch (error) {
        console.log('Error ao obter/salvar filmes')
        console.log(error);

        var reposta = {
            status: 'error',
            msg: 'Obtivemos um erro ao obter/salvar com o servidor'
        }
        return reposta;

    }

}

const autenticar_servidor = async (request) => {
    if (request.query == null || request.query.token == null || request.query.token != token) {
        return false;
    }
    return true;
}


exports.app = functions.https.onRequest(app)