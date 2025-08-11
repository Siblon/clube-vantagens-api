async function carregar(){
  const res = await fetch('/assinaturas/listar');
  const clientes = await res.json();
  const tbody = document.querySelector('#tab-clientes tbody');
  clientes.forEach(cli => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${cli.nome}</td><td>${cli.cpf}</td><td>${cli.id_interno||''}</td>` +
      `<td><button class="btn btn--small btn-code">Gerar Code128</button> <button class="btn btn--small btn-qr">Gerar QR</button></td>`;
    tr.querySelector('.btn-code').addEventListener('click', ()=>gerarEtiqueta(cli));
    tr.querySelector('.btn-qr').addEventListener('click', ()=>gerarEtiqueta(cli));
    tbody.appendChild(tr);
  });
}

function gerarEtiqueta(cli){
  if(!cli.id_interno) return;
  const container = document.getElementById('etiquetas');
  const div = document.createElement('div');
  div.className = 'etiqueta';
  div.innerHTML = `<div class="nome">${cli.nome}</div>`+
    `<div class="id">${cli.id_interno}</div>`+
    `<div class="cpf">${cli.cpf}</div>`+
    `<svg class="barcode"></svg>`+
    `<div class="qr"></div>`+
    `<button class="btn print-btn">Imprimir</button>`;
  container.appendChild(div);
  JsBarcode(div.querySelector('.barcode'), cli.id_interno, {format:'code128', displayValue:false, width:2, height:40});
  new QRCode(div.querySelector('.qr'), {text: cli.id_interno, width:64, height:64});
  div.querySelector('.print-btn').addEventListener('click', ()=>window.print());
}

document.addEventListener('DOMContentLoaded', carregar);
