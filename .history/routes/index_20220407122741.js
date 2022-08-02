var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  //res.render('index', { title: 'Express' });
  res.json({
    nombre: "Lider",
    apellido: "Andrade",
    roles: [
      {
        nombre : "Producto1",
        precio: "$120.20"
      },
      {
        nombre : "Producto2",
        precio: "$20.20"
      },
      {
        nombre : "Producto3",
        precio: "$30.50"
      }
    ] 
  })
});

module.exports = router;
