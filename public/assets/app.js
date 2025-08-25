function getPin(){return sessionStorage.getItem('adminPin')||''}
function setPin(pin){sessionStorage.setItem('adminPin',pin)}
async function apiFetch(path,options={}){
  const opt={...options};opt.headers={...(options.headers||{})};
  const pin=getPin();if(pin)opt.headers['x-admin-pin']=pin;
  const res=await fetch(path,opt);
  let data;try{data=await res.json();}catch{data=null;}
  if(!res.ok){const msg=data&&data.error?data.error:res.statusText;throw new Error(msg)}
  return data;
}
function showAlert(container,msg,type='error'){
  container.textContent=msg;container.className='alert '+type;}
function clearAlert(container){container.textContent='';container.className='';}
function attachPinInput(input,onChange){input.value=getPin();input.addEventListener('change',e=>{setPin(e.target.value);if(onChange)onChange(e.target.value);});}
window.App={getPin,setPin,apiFetch,showAlert,clearAlert,attachPinInput};
