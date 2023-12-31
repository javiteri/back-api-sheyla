var express = require('express');
var helmet = require('helmet');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors')
var path = require('path');
var createError = require('http-errors');
const passport = require('passport');

require('dotenv').config({path: path.join(__dirname, '.env')});
require('./src/middlewares/auth/auth');

const loginRouter = require('./src/controllers/login/login_routes');
const registroEmpresaRouter = require('./src/controllers/registro-empresa/registro_empresa_routes');
const clientesRouter = require('./src/controllers/clientes/clientes_routes');
const usuariosRouter = require('./src/controllers/usuarios/usuarios-routes');
const proveedoresRouter = require('./src/controllers/proveedores/proveedores-routes');
const productosRouter = require('./src/controllers/productos/productos-routes');
const ventasRouter = require('./src/controllers/ventas/ventas_routes');
const comprasRouter = require('./src/controllers/compras/compras_routes');
const cajaRouter = require('./src/controllers/caja/caja-routes');
const configsRouter = require('./src/controllers/configuracion/configs_routes');
const fileConfigsRouter = require('./src/controllers/configuracion/fileconfig_routes.js');
const dashboardRoter = require('./src/controllers/dashboard/dashboard_routes');
const documentosElectronicosRouter = require('./src/controllers/documentos-electronicos/documentos_electronicos_routes');
const establecimientosRouter = require('./src/controllers/establecimientos/establecimientos_routes');
const proformasRouter = require('./src/controllers/proformas/proformas_routes');
const paymentsRouter = require('./src/controllers/payments/payments_routes');


const Arena = require('bull-arena');
const Bull = require('bull');

const arenaConfig = Arena({
  Bull,
  queues: [
    {
      type: 'bull',
      name: "docelectronicos",
      hostId: 'Cola de Envios Documentos Electronicos'
    },{
      type: 'bull',
      name:'docelectronicos-validar',
      hostId: 'Cola de Validacion de Envios'
    }
  ],
},
{
  // Make the arena dashboard become available at {my-site.com}/arena.
  basePath: '/arena',

  // Let express handle the listening.
  disableListen: true,
});

var app = express();

app.use(helmet());
app.use(express.json({
  limit: '20mb'
}));
// Make arena's resources (js/css deps) available at the base app route
app.use('/', arenaConfig);
app.use(cors());

app.use(logger('dev'));
app.use('/api/configsfile', passport.authenticate('jwt',{session: false}), fileConfigsRouter);
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/api', loginRouter)
app.use('/api', passport.authenticate('jwt', {session: false}), registroEmpresaRouter)

// Plug in the JWT strategy as a middleware so only verified users can access this route.
app.use('/api/clientes', passport.authenticate('jwt', {session: false}) , clientesRouter)
app.use('/api/proveedores', passport.authenticate('jwt', {session: false}), proveedoresRouter);
app.use('/api/productos', passport.authenticate('jwt', {session: false}), productosRouter);
app.use('/api/usuarios', passport.authenticate('jwt', {session: false}), usuariosRouter);
app.use('/api/ventas', passport.authenticate('jwt', {session: false}), ventasRouter);
app.use('/api/compras', passport.authenticate('jwt',{session: false}), comprasRouter);
app.use('/api/caja', passport.authenticate('jwt',{session: false}), cajaRouter);
app.use('/api/configs', passport.authenticate('jwt',{session: false}), configsRouter);
app.use('/api/dashboard', passport.authenticate('jwt',{session: false}), dashboardRoter );
app.use('/api/documentos_electronicos', passport.authenticate('jwt',{session: false}), documentosElectronicosRouter);
app.use('/api/establecimientos', passport.authenticate('jwt',{session: false}), establecimientosRouter);
app.use('/api/proformas', passport.authenticate('jwt',{session: false}), proformasRouter);
app.use('/api/payments', passport.authenticate('jwt', { session: false}), paymentsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  //res.locals.error = req.app.get('env') === 'development' ? err : {};
  console.log('error en app js error handler');
  console.log(err.message);

  /*console.log(err);
  console.log('error found route')*/
  
  // render the error page
  res.status(err.status || 500);
  res.json(err)
  //res.render('error');
});

module.exports = app;
