/*
USED TO INITIALLY LOAD DATABASE THIS IS NOT FOR MONITORING.
*/
const axios = require('axios');
const MongoClient = require('mongodb').MongoClient;
const url = "mongodb://localhost:27017/";

var item_data = new Map();
var current_stock = [];


axios({
    method: "GET",
    url: "https://www.supremenewyork.com/mobile_stock.json"
}).then((response) => {

    var products = response.data.products_and_categories;
    item_data.set('Bags', products.Bags);
    item_data.set('Accessories', products.Accessories);
    item_data.set('Shoes', products.Shoes);
    item_data.set('Hats', products.Hats);
    item_data.set('Sweatshirts', products.Sweatshirts);
    item_data.set('Shirts', products.Shirts);
    item_data.set('Jackets', products.Jackets);
    item_data.set('Shorts', products.Shorts);
    item_data.set('Pants', products.Pants);
    item_data.set('Skate', products.Skate);
    item_data.set('Tops/Sweaters', products['Tops/Sweaters'])

    

    item_data.forEach(function(value, key) {
        console.log(`Adding items in ${key}`)
        value.forEach(function(product) {

            MongoClient.connect(url, function(err, db) {
                if (err) throw err;
                var dbo = db.db("database")
                dbo.collection('supreme-items').insertOne({_id: product.id, name: product.name, category: product.category_name, price: `$${product.price.toString().substring(0, product.price.toString().length-2)}`}, (err, obj) => {
                    //console.log(`${product.name} added`);
                    db.close();
                })
              });
            current_stock.push(axios.get(`https://www.supremenewyork.com/shop/${product.id}.json`))
        })
    })

}).then(() => {
    return axios.all(current_stock).then(axios.spread((...response) => {
        response.forEach((value, index) => {
            var product_id = value.config.url.match('https:\/\/www.supremenewyork.com\/shop\/(.*).json')[1];
            var colors = [];
            value.data.styles.forEach((style) => {
                var sizes = [];
                style.sizes.forEach((size) => {
                    sizes.push({
                        size: size.name,
                        id: size.id,
                        stock_level: size.stock_level
                    })
                })
                colors.push({
                    name: style.name,
                    id: style.id,
                    img_url: style.image_url_hi.substring(2, style.image_url_hi.length),
                    sizes: sizes
                })
            })
            
            var color_query = { colors: colors }
       
            MongoClient.connect(url, function(err, db) {
                if (err) throw err;
                var dbo = db.db('database');
                dbo.collection('supreme-items').updateOne({ _id: parseInt(product_id) }, {$set: color_query}, (err, res) => {
                    if(err) throw err
                    console.log(`${product_id} updated`)
                    db.close();
                })
            })
        })
        
    }))
})
.catch(error => console.log(error))
