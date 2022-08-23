var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors')
var path = require('path');
var createError = require('http-errors');
const passport = require('passport')

require('dotenv').config();
require('./src/middlewares/auth/auth');

const loginRouter = require('./src/controllers/login/login_routes');
const registroEmpresaRouter = require('./src/controllers/registro-empresa/registro_empresa_routes');
const clientesRouter = require('./src/controllers/clientes/clientes_routes');
const usuariosRouter = require('./src/controllers/usuarios/usuarios-routes');

var app = express();

app.use(cors())

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/api', loginRouter)
app.use('/api', passport.authenticate('jwt', {session: false}), registroEmpresaRouter)

// Plug in the JWT strategy as a middleware so only verified users can access this route.
app.use('/api/clientes', passport.authenticate('jwt', {session: false}) , clientesRouter)

app.use('/api/usuarios', passport.authenticate('jwt', {session: false}), usuariosRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  console.log('error found route')
  
  // render the error page
  res.status(err.status || 500);
  res.json(err)
  //res.render('error');
});

module.exports = app;
