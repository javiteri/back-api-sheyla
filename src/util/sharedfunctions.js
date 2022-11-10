const codDoc = [
    {
        nombre: 'Factura',
        codigo: '01',
    },
    {
        nombre: `
        LIQUIDACIÓN DE COMPRA DE 
        BIENES Y PRESTACIÓN DE 
        SERVICIOS`,
        codigo: '03'
    },
    {
        nombre: 'NOTA DE CRÉDITO',
        codigo: '04',
    },
    {
        nombre: 'NOTA DE DÉBITO',
        codigo: '05',
    },
    {
        nombre: 'GUÍA DE REMISIÓN ',
        codigo: '06',
    },
    {
        nombre: 'COMPROBANTE DE RETENCIÓN',
        codigo: '07',
    }
  ];

const codFormasPago = [
    {
        nombre: 'SIN UTILIZACION DEL SISTEMA FINANCIERO',
        codigo: '01',
    },
    {
        nombre: `COMPENSACIÓN DE DEUDAS`,
        codigo: '15'
    },
    {
        nombre: 'TARJETA DE DÉBITO',
        codigo: '16',
    },
    {
        nombre: 'DINERO ELECTRÓNICO',
        codigo: '17',
    },
    {
        nombre: 'TARJETA PREPAGO',
        codigo: '18',
    },
    {
        nombre: 'TARJETA DE CRÉDITO',
        codigo: '19',
    },
    {
        nombre: 'OTROS CON UTILIZACION DEL SISTEMA FINANCIERO',
        codigo: '20',
    },
    {
        nombre: 'ENDOSO DE TÍTULOS',
        codigo: '21',
    }
];


exports.modulo11 = (clave48Digitos) =>{
    let suma = 0;
    let factor = 7;
  
    const arrayDigits = Array.from(clave48Digitos);
  
    arrayDigits.forEach(element => {

        suma = suma + Number(element) * factor;
  
        factor = factor - 1;
        if(factor == 1) factor = 7;
    });
  
    let digitoVerificador = (suma % 11);
    digitoVerificador = 11 - digitoVerificador;
    if(digitoVerificador == 11){
        digitoVerificador = 0;
    }else if(digitoVerificador == 10){
        digitoVerificador = 1;
    }
  
    return `${clave48Digitos}${digitoVerificador}`;
}

exports.getTipoComprobanteVenta = (tipoVenta) => {
    let codigo = '';
  
    codDoc.forEach((element) => {
        if(element.nombre.toUpperCase().includes(tipoVenta.toUpperCase())){
            codigo = element.codigo
        }
    });

    return codigo;
}

exports.getFormaDePagoRide = (formaPago) => {
    if(formaPago == 'Efectivo' || formaPago == 'EFECTIVO' || formaPago == 'Credito'|| formaPago == 'CREDITO'){
        return 'SIN UTILIZACION DEL SISTEMA FINANCIERO';
    }else{
        return 'OTROS CON UTILIZACION SISTEMA FINANCIERO';
    }
}