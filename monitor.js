const axios = require('axios');
const MongoClient = require('mongodb').MongoClient;
var moment = require('moment');
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const url = "mongodb://localhost:27017/";


var WEBHOOK;
const POLL_INTERVAL = 2500;

var item_data = new Map();

rl.question("Enter discord webhook: ", (webhook) => {
  WEBHOOK = webhook;
  if(!WEBHOOK.includes('discord')) {
    console.log("Invalid webhook")
  } else {
    setInterval(poll, POLL_INTERVAL);
    console.log("Monitoring....");
  }
})





function poll() {
    console.log("Monitoring.... @" + moment().format('LTS'));
    var d = new Date()
    var date = d.getTime()
    axios({
        method: "GET",
        url: "https://www.supremenewyork.com/mobile_stock.json"
    }).then((response) => {
    
        var products = response.data.products_and_categories;
        item_data.set('bags', products.Bags);
        item_data.set('accessories', products.Accessories);
        item_data.set('shoes', products.Shoes);
        item_data.set('hats', products.Hats);
        item_data.set('sweatshirts', products.Sweatshirts);
        item_data.set('shirts', products.Shirts);
        item_data.set('jackets', products.Jackets);
        item_data.set('shorts', products.Shorts);
        item_data.set('pants', products.Pants);
        item_data.set('skate', products.Skate);
        item_data.set('tops/sweaters', products['Tops/Sweaters'])
    
        item_data.forEach(function(value, key) {
            value.forEach(function(product) {
    
                MongoClient.connect(url, function(err, db) {
                    if (err) throw err;
                    var dbo = db.db("database")
                    dbo.collection('supreme-items').find({ name: product.name }).toArray((err, result) => {
                        if (err) throw err;
                        if(result.length == 0) {
                            addItem(product);
                        } else {
                            checkRestock(product);
                        }
                        db.close();
                    })
                  });
            })
        })
    }).catch(e => console.log(e))    
}


function addItem(product) {
    notifyNewItem(product);
    MongoClient.connect(url, function(err, db)  {
        if (err) throw err;
        var dbo = db.db("database")
        dbo.collection('supreme-items').insertOne({ _id: parseInt(product.id), name: product.name, category: product.category_name, price: `$${product.price.toString().substring(0, product.price.toString().length-2)}`}, (err, obj) => {
            //console.log(`${product.name} added`);
            db.close();
        })
    })

    axios.get(`https://www.supremenewyork.com/shop/${product.id}.json`)
        .then((response) => {
            var product_id = response.config.url.match('https:\/\/www.supremenewyork.com\/shop\/(.*).json')[1];
            var colors = [];
            response.data.styles.forEach((style) => {
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
                    sizes: sizes
                })
            })

            var color_query = { colors: colors }

            MongoClient.connect(url, function(err, db) {
                if(err) throw err;
                var dbo = db.db('database');
                var id_val = { _id: parseInt(product_id) };
                dbo.collection('supreme-items').updateOne(id_val, {$set: color_query}, (err, res) => {
                    if (err) throw err
                    db.close();
                })
            })
        })
        .catch(e => console.log(e))
}

function checkRestock(product) {
    MongoClient.connect(url, function(err, db) {
        if(err) throw err;
        var dbo = db.db('database');
        dbo.collection('supreme-items').findOne({ _id: product.id}, function(err, result) {
            if(err) throw err;
            axios.get(`https://www.supremenewyork.com/shop/${product.id}.json`)
                .then((response) => {
                   updateItem(response);
                })
                .catch(e => console.log(e));
            db.close();
        })
    })
}


function updateItem(response) {
    var product_id = response.config.url.match('https:\/\/www.supremenewyork.com\/shop\/(.*).json')[1];
    var colors = [];
    response.data.styles.forEach((style) => {
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
            img_url: style.image_url_hi.substring(2, style.image_url_hi.lengh),
            sizes: sizes
        })
    })

    var color_query = { colors: colors }

    MongoClient.connect(url, function(err, db) {
        if(err) throw err;
        var dbo = db.db('database');
        var id_val = { _id: parseInt(product_id) };
        dbo.collection('supreme-items').findOne({ _id: parseInt(product_id)}, function(err, result) {
            if(err) throw err;
            result.colors.forEach((color, i) => {
                color.sizes.forEach((size, j) => {
                    if(colors[i].sizes[j].stock_level > size.stock_level) {
                        //item restocked
                        var item = {name: result.name, 
                            color: color.name, 
                            size: size.size,
                            img_url: color.img_url,
                            price: result.price,
                            category: result.category,
                            color_size_id: size.id,
                            id: result._id
                        }
                        notifyRestock(item);
                    }
                })
            })

        })

        dbo.collection('supreme-items').updateOne(id_val, {$set: color_query}, (err, res) => {
            if(err) throw err;
            db.close();
        })
    })
}

function notifyNewItem(product) {
  console.log(`New Item Found: ${product.name} at ${moment().format('LTS')}`)
    var price = product.price.toString()
    axios({
        method: 'POST',
        url: WEBHOOK,
        data: {
            embeds: [{
              title: "New Item Found",
              color: 13632027,
              footer: {
                text: "supreme-monitor by rlpham"
              },
              thumbnail: {
                  url: `https://${product.image_url_hi.substring(2, product.image_url_hi.length)}`
              },
              fields: [
                {
                  name: "Item",
                  value: product.name,
                  inline: false
                },
                {
                  name: "Category",
                  value: product.category_name,
                  inline: true
                },
                {
                  name: "Price",
                  value: `$${price.substring(0, price.length - 2)}`,
                  inline: true
                },
                {
                  name: "Time",
                  value: moment().format('LTS'),
                  inline: false
                },
                {
                  name: "Links",
                  value: `[Product Page](https://www.supremenewyork.com/shop/${product.id})`
                }
              ]
            }]
          }
        
    })
    .catch(e => console.log("Error sending webhook"));
}

function notifyRestock(item) {
    console.log(`Item Restocked: ${item.name} - ${item.size} - ${item.color} at ${moment().format('LTS')}`)
    axios({
        method: 'POST',
        url: WEBHOOK,
        data: {
            embeds: [{
              title: "Item Restock",
              color: 13632027,
              footer: {
                text: "supreme-monitor by rlpham"
              },
              thumbnail: {
                url: `https://${item.img_url}`
              },
              fields: [
                {
                  name: "Item",
                  value: item.name,
                  inline: false
                },
                {
                  name: "Color",
                  value: item.color,
                  inline: true
                },
                {
                  name: "Size",
                  value: item.size,
                  inline: true
                },
                {
                  name: "Price",
                  value: item.price,
                  inline: false
                },
                
                {
                  name: "Time",
                  value: moment().format('LTS'),
                  inline: true
                },
                {
                  name: "Links",
                  value: `[Product Page](https://www.supremenewyork.com/shop/${item.id})`
                }
              ]
            }]
          }
        
    })
    .catch(e => console.log("Error sending webhook"));
}