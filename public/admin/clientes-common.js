function getPin(){
  let pin = localStorage.getItem('ADMIN_PIN');
  if(!pin){
    pin = prompt('Informe o PIN do admin');
    if(pin) localStorage.setItem('ADMIN_PIN', pin);
  }
  return pin || '';
}
