exports.status = (req,res)=> res.json({ ok:true, integration:'mercado-pago', ready:false });
exports.createCheckout = (req,res)=> res.status(501).json({ ok:false, error:'Mercado Pago não configurado' });
exports.webhook = (req,res)=> res.status(204).end();
