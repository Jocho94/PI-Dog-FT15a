const { Router } = require('express');
const axios = require('axios');
const { API_KEY } = process.env;
const { Dog, Temperaments,Op } = require('../db') // traigo los modelos de db.js para poder usarlos

// Importar todos los routers;
// Ejemplo: const authRouter = require('./auth.js');

const router = Router();


// Configurar los routers
// Ejemplo: router.use('/auth', authRouter);

const getApiInfo = async () => { // traigo la info que necesito de la api
    const url = await axios.get(`https://api.thedogapi.com/v1/breeds?api_key=${API_KEY}`);
    const dogs = url.data.map(el => {
        return {
            name: el.name,
            id: el.id,
            height: el.height.metric,
            weight: el.weight.metric,
            temperament: el.temperament && el.temperament.split(",").map(el => el.trim()),
            life_span: el.life_span,
            image: el.image.url,
        }
    });
    return dogs
}

const getDBInfo = async () => { // trigo la info de la BdD
    return await Dog.findAll({ //await para esperar que busque, busca todo en el model Dog
        includes: { // inclui el model Temperaments, especificamente el atributo name
            model: Temperaments,
            attributes: ['name'],
            through: {
                attributes: [],
            }
        }
    });
};

const getAllInfo = async () => { // concateno en una funcion la llamada a la api y a la info
    const apiInfo = await getApiInfo();     //await para esperar la llamada
    const DBinfo = await getDBInfo();    //await para esperar la llamada
    const allInfo = apiInfo.concat(DBinfo);
    return allInfo
};

const getAllTemps = async () => {
    try {
        const url = await getApiInfo();
        let arr = [];
        // console.log(url)
        url.map(el => {
            if (el.temperament) {
                // console.log(el)
                arr = [...arr, ...el.temperament]
            }
        }); // algunos llegan undefined, por eso el ternario. array de array
        arr = [...new Set(arr)].sort();
        console.log(arr)
        return arr
    } catch (error) {
        console.log(error)
    }

};

//ROUTING

router.get('/dogs', async (req, res) => {
    const name = req.query.name;
    let allDog = await getAllInfo(); // pido la info de la BdD y de la api 
    if (name) {// si existe un query
        let dogName = allDog.filter(el => el.name.toLowerCase().includes(name.toLowerCase())); // paso el name del llamado y el name del query a minuscula para poder compararlos
        dogName.length ? // consulto si existe dogName - es un ternario
            res.status(200).send(dogName) :
            res.status(400).send('La raza de perro ingresada no existe');
    }
    else {
        res.status(200).send(allDog);
    }
})

router.get('/dogs/:idRaza', async (req, res) => {
    const id = req.params.idRaza  // busco por params
    console.log(id);

    let allDog = await getAllInfo();
    console.log(allDog)
    let dogName = allDog.filter(el => el.id == id); // le coloco == por que no son el mismo tipo de dato 
    dogName.length ? // consulto si existe dogName - es un ternario
        res.status(200).send(dogName) :
        res.status(400).send('La raza de perro ingresada no existe');
})

router.get('/temperament', async (req, res) => {
    const allTemps = await getAllTemps();
    console.log(allTemps)
    allTemps.map(el => {
        Temperaments.findOrCreate({ // en la base de datos, en la tabla temperaments, creo cada uno de los teperamentos, si ya esta no lo agrega
            where: { name: el }
        })
    })
    const temperaments = await Temperaments.findAll(); // busco todo en la tabla temperaments
    res.send(temperaments)
})

router.post('/dog', async (req, res) => {
    const { name, height, weight, temperament, image, life_span, createInDB } = req.body;
    // const body = req.body;
    // console.log(body);
    let newDog = await Dog.create({
        name,
        height,
        weight,
        image,
        life_span,
        createInDB
    });
    console.log(temperament);
    let arr = [...temperament]
    console.log(arr, "arr")
    let temp = await Temperaments.findAll({where: { name: arr } }  )
    console.log(temp, "find")
    temp = temp.map(el=> el.id)
    console.log(temp,"temp");
    console.log(newDog)
    await newDog.addTemperaments(temp)
    res.send("newDog")
})
module.exports = router;
