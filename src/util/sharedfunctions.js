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

exports.modulo11 = async (clave48Digitos) =>{
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

exports.getTipoComprobanteVenta = async(tipoVenta) => {
    let codigo = '';
  
    codDoc.forEach((element) => {
        
        if(element.nombre.includes(tipoVenta)){
            codigo = element.codigo
        }
    });

    return codigo;
}